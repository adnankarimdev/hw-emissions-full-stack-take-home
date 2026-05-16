# Backend Architecture

This API is a modular NestJS monolith using a Command/Processor pattern for application workflows, repository classes for persistence, and Prisma/PostgreSQL for transactional data integrity.

## Structure

```text
src/
  modules/
    sites/                    asset management, site metrics, and per-site analytics
    ingestion/                batch ingestion use case
      commands/               immutable use-case input objects
      processors/             transaction orchestration and business workflow
      repositories/           measurement and ingest batch persistence
    outbox/                   transactional outbox persistence and worker seam
    chat/                     durable operations chat sessions and messages

  shared/
    database/                 Prisma client and database module
    errors/                   application errors and API exception filter
    responses/                unified success response interceptor
    transactions/             transaction boundary helper
    validation/               Zod request validation pipe
```

## Request Flow

```text
Controller
  -> Zod validation pipe
  -> Service
  -> Command
  -> Processor
  -> Repositories
  -> Prisma transaction
```

Controllers are transport adapters. They validate request shapes and delegate to services. Services keep the public module API small. Processors own multi-step workflows that need transactional guarantees.

## Data Model Rationale

The data model is derived from the required workflows and consistency guarantees:

- `Site` is the aggregate root for asset management. It owns the monitoring configuration for an industrial site, including `emission_limit`, flexible `metadata`, and the denormalized `total_emissions_to_date` summary used by the metrics endpoint.
- `Measurement` stores the raw methane readings as append-only audit records. Measurements are kept separate from `Site` because they represent source facts, while the site total is a read-optimized summary derived from those facts.
- `IngestBatch` models a single client ingestion attempt and is the boundary for retry safety. It stores the `idempotency_key`, canonical `request_hash`, reading count, and total emissions contributed by the batch.
- `OutboxEvent` records domain events in the same transaction as the ingestion write. This supports reliable downstream processing for alerting, analytics, notifications, or future integrations without coupling those concerns to the request path.
- `ChatSession` and `ChatMessage` persist the operations copilot conversation history in Postgres instead of relying on the Next.js server filesystem. The session is the conversation aggregate, while messages are ordered child records that store the AI SDK UI message id, role, parts JSON, and optional metadata. This preserves the full rendered/tool-call conversation state across browser restarts, server restarts, and Vercel deployments.

The most important modeling choice is that `sites.total_emissions_to_date` is stored as a denormalized summary while `measurements` remain the source of truth. This gives `GET /sites/:id/metrics` a fast read path without sacrificing auditability or the ability to recalculate totals if business rules change later.

`GET /sites/:id/emissions-trend` intentionally reads from `measurements` rather than from dashboard mock data. It returns UTC daily points for one site, including daily methane totals, a cumulative emissions line, the configured site limit, and the compliance status for each point. The service calculates the pre-window baseline first, then adds each day's measurements so a seven-day graph still reflects the site's full cumulative history.

Compliance status is intentionally computed at read time instead of persisted:

```text
total_emissions_to_date <= emission_limit
  -> "Within Limit"
otherwise
  -> "Limit Exceeded"
```

Persisting this status would create a second source of truth that could become stale if the emission limit changes. Computing it from the current limit and current total keeps the response deterministic and avoids unnecessary write complexity.

## Data Integrity

`POST /ingest` performs the critical workflow in one database transaction:

1. Verify the site exists.
2. Create an `ingest_batches` row keyed by `(site_id, idempotency_key)`.
3. Insert raw `measurements`.
4. Atomically increment `sites.total_emissions_to_date`.
5. Write an `outbox_events` row for downstream alerting.

The site total is updated with a database-level increment, so concurrent ingestion requests do not overwrite each other.

## Idempotency

Retries are controlled by a unique constraint:

```text
UNIQUE(site_id, idempotency_key)
```

The ingestion processor stores a hash of the canonical request payload. If a client retries with the same key and same payload, the API returns the existing batch response with `duplicate: true` and does not insert measurements or increment totals again.

If a client reuses the same idempotency key with a different payload, the API returns `409 IDEMPOTENCY_CONFLICT`.

## Unified API Responses

All successful responses are wrapped as:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "request_id": "...",
    "timestamp": "..."
  }
}
```

Errors use the same platform envelope:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request validation failed.",
    "details": {}
  },
  "meta": {
    "request_id": "...",
    "timestamp": "..."
  }
}
```

## Prisma

Prisma schema and migrations live under `prisma/`. The generated client is intentionally ignored and regenerated during `npm run build`.

Key tables:

- `sites`
- `ingest_batches`
- `measurements`
- `outbox_events`
- `chat_sessions`
- `chat_messages`

The initial migration is checked in at `prisma/migrations/20260515000000_init/migration.sql`; chat persistence is added in `prisma/migrations/20260516000000_add_chat_sessions/migration.sql`.
