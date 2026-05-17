# Best Practices Coverage

This document explains the Senior/Lead bonus items implemented in this take-home. It focuses on the three strongest engineering practices demonstrated by the codebase:

1. Concurrency Control
2. Architecture Pattern
3. Transactional Outbox

The goal is to show how the implementation handles the hard parts of a methane ingestion platform: concurrent writes, atomic updates, retry safety, failure isolation, and future extensibility.

## 1. Concurrency Control

### Requirement

The bonus requirement asks:

> How does the system handle 10 concurrent sources updating the same site_id? Implement a protection strategy, for example Optimistic or Pessimistic locking.

This implementation uses pessimistic locking.

### Where It Lives

Key files:

- `apps/api-server/src/modules/sites/sites.repository.ts`
- `apps/api-server/src/modules/ingestion/processors/ingest-measurements.processor.ts`
- `apps/api-server/test/app.e2e-spec.ts`
- `apps/web-app/features/simulation/components/concurrency-simulation-page.tsx`

The row lock is implemented in `SitesRepository.lockByIdForUpdate()`:

```sql
SELECT id
FROM sites
WHERE id = CAST(${id} AS uuid)
FOR UPDATE
```

The ingestion processor calls this method inside the Prisma transaction before it creates the batch, inserts measurements, increments the site total, or writes the outbox event.

### Why Pessimistic Locking

This is a write-heavy critical path. Many field sources can legitimately report to the same site at roughly the same time, and every accepted batch updates the same denormalized aggregate: `sites.total_emissions_to_date`.

There are two common strategies:

- Optimistic locking: let writers proceed, detect conflicts with a version column, then retry.
- Pessimistic locking: serialize the critical section with a database row lock.

Pessimistic locking is the better fit here because:

- The locked section is short.
- The contention scope is narrow: one site row.
- Field clients may already be operating in low-connectivity environments.
- The API should not expose version-conflict retry behavior to IoT-style clients.
- The database is better positioned than application code to serialize writes safely.

The lock only blocks writers touching the same `site_id`. Ingestion for different sites can continue concurrently because those transactions lock different rows.

### Atomic Increment

The lock is paired with a database-level atomic increment:

```ts
totalEmissionsToDate: {
  increment: amount,
}
```

The lock serializes competing same-site transactions. The atomic increment protects the denormalized total from lost updates. Together, they make the persisted site total safe under concurrent ingestion.

### What Happens With 10 Concurrent Sources

When 10 sources submit unique batches for the same site:

1. All 10 requests enter the API.
2. Each request starts the ingestion transaction.
3. Each request attempts to lock the same site row.
4. PostgreSQL allows one transaction to hold that lock at a time.
5. The active transaction inserts its batch and measurements.
6. It atomically increments the site total.
7. It writes the outbox event.
8. It commits and releases the lock.
9. The next waiting transaction proceeds.
10. The final site total equals the sum of all committed batches.

This is not a frontend-only demo. The backend e2e test performs real concurrent API calls with `Promise.all`, then verifies:

- every request succeeds
- 10 measurement records exist
- 10 ingest batch records exist
- the final `GET /sites/:id/metrics` total equals the expected sum

### Why This Prevents Lost Updates

Without concurrency control, two transactions could read the same current total, both compute a new total, and one update could overwrite the other. That is the classic lost-update problem.

This implementation avoids that by never doing a read-modify-write calculation in application memory. The database performs the increment, and the site row lock serializes the transactions that target the same aggregate.

### Reviewer-Facing Simulation

The frontend also includes `/simulation`, which creates an isolated site and sends concurrent ingestion requests against the real backend. It then reads the site metrics endpoint and compares expected emissions against the persisted total.

The simulation is intentionally built on the same API clients as the dashboard. It does not mock the response or patch local totals. Its purpose is to give reviewers a quick, visible way to exercise the concurrency strategy.

## 2. Architecture Pattern

### Requirement

The bonus requirement asks:

> Demonstrate a scalable approach, such as Command/Processor patterns (OOP) or an Event-Driven model.

This implementation uses a Command/Processor pattern for the ingestion workflow, with NestJS module boundaries and repository-based persistence.

### Why This Pattern

The ingestion path is the highest-risk path in the application. It does more than write one row:

- validate client intent
- normalize request data
- compute a canonical request hash
- open a transaction
- lock the site
- create an ingest batch
- insert measurements
- increment the site summary
- write an outbox event
- handle duplicate retries
- handle idempotency conflicts

Putting all of that directly in a controller would make the HTTP layer responsible for business correctness. Putting it all in a generic service would make the service a large procedural script. The Command/Processor pattern gives the workflow a clear shape.

### Request Flow

```text
POST /ingest
  -> IngestController
  -> IngestionService
  -> IngestMeasurementsCommand
  -> IngestMeasurementsProcessor
  -> Repositories
  -> Prisma transaction
  -> PostgreSQL
```

Each layer has a specific job.

### Controller

The controller is a transport adapter. It receives HTTP input and delegates to the module service.

It should not:

- know how idempotency is enforced
- know which tables are written
- know transaction ordering
- know how duplicate retries are handled

That keeps the controller easy to read and easy to change if the transport changes later.

### Service

The service is the public module API. For ingestion, it keeps a small surface area and passes normalized work to the processor.

This is useful because other application paths could call the service without needing to know about controller decorators or HTTP request objects.

### Command

`IngestMeasurementsCommand` represents the normalized use-case input.

It converts external request fields into internal values:

- `site_id` becomes `siteId`
- readings become typed command readings
- `measured_at` strings become `Date` objects
- the batch emissions total is derived from readings
- the canonical request hash is computed

The request hash is especially important. Idempotency is not just "same key means same operation." It is "same key and same payload means same operation." If a client reuses a key with different readings, the processor can detect that mismatch and reject it.

### Processor

`IngestMeasurementsProcessor` owns the business workflow.

It is responsible for the exact ordering of the critical transaction:

1. Lock the site.
2. Create the batch record.
3. Insert measurements.
4. Increment the site total.
5. Create the outbox event.
6. Return the ingestion result.

It also owns duplicate retry behavior. If the batch insert hits the unique idempotency constraint, the processor loads the existing batch, compares request hashes, and either returns a duplicate-safe response or raises an idempotency conflict.

This is the right place for this logic because the processor is the application workflow boundary. It coordinates multiple repositories without letting persistence details leak into the controller.

### Repositories

Repositories own database operations:

- `SitesRepository`
- `MeasurementsRepository`
- `OutboxRepository`

They do not decide the business workflow. They expose focused operations that the processor composes inside one transaction.

This keeps persistence logic testable and explicit. The one raw SQL query for `SELECT ... FOR UPDATE` is isolated in `SitesRepository`, where the locking concern belongs.

### Transaction Manager

The transaction manager wraps Prisma's transaction API behind a small application-level abstraction.

This keeps transaction creation out of controllers and avoids scattering direct transaction calls across the codebase. If transaction policy needed to change later, such as adding isolation settings or instrumentation, there is a single seam.

### Why This Is Scalable

This pattern is scalable from a team perspective, not just from a runtime perspective.

Another engineer can open the ingestion module and quickly identify:

- where requests enter
- where request data is normalized
- where the transaction is orchestrated
- where database operations live
- where duplicate retry behavior is handled
- where outbox events are created

The abstractions are not generic for their own sake. They map to real responsibilities in the ingestion workflow.

### Testability

The processor has focused unit tests that verify:

- measurements are persisted
- the site total is incremented
- the outbox event is written
- all of those operations use the transaction client
- identical duplicate retries do not create records or increment totals
- conflicting idempotency keys are rejected
- missing sites fail before ingestion records are written

The e2e tests then verify the same behavior through the actual HTTP API and database.

This split gives fast feedback at the workflow level and confidence at the system level.

## 3. Transactional Outbox

### Requirement

The bonus requirement asks:

> Implement the Outbox Pattern to ensure that once a measurement is saved, a downstream "Alerting Service" is guaranteed to be notified.

This implementation creates a durable outbox event in the same transaction as the measurement write. That guarantees the system does not commit measurement data without also committing the notification intent.

### Where It Lives

Key files:

- `apps/api-server/prisma/schema.prisma`
- `apps/api-server/src/modules/outbox/outbox.repository.ts`
- `apps/api-server/src/modules/outbox/outbox.worker.ts`
- `apps/api-server/src/modules/ingestion/processors/ingest-measurements.processor.ts`

The `OutboxEvent` table stores:

- aggregate type
- aggregate id
- event type
- event payload
- status
- attempt count
- next attempt timestamp
- processed timestamp
- created and updated timestamps

The ingestion processor writes a `measurement.batch_ingested` event through `OutboxRepository.createMeasurementIngestedEvent()`.

### Why An Outbox Is Needed

The unsafe alternative is to write measurements to the database and then call an external alerting service inline:

```text
insert measurements
update site total
call alerting service
return response
```

That looks simple, but it creates failure gaps:

- The database commit could succeed and the alerting call could fail.
- The alerting call could succeed and the database transaction could roll back.
- The request could timeout while the external service is still processing.
- A retry could notify twice.

The transactional outbox avoids this by separating durable intent from external delivery.

### Implemented Flow

The ingestion transaction writes both the measurement data and the outbox event:

```text
BEGIN
  lock site row
  insert ingest batch
  insert measurements
  increment site total
  insert outbox event
COMMIT
```

If the transaction commits, the event exists. If the transaction rolls back, the event does not exist.

That is the key guarantee:

```text
measurement saved -> outbox event saved
measurement rolled back -> no outbox event
```

This prevents the system from announcing work that did not commit, and it prevents committed measurement work from having no downstream notification record.

### Event Payload

The outbox event contains enough information for a future alerting worker to process the batch:

```json
{
  "site_id": "...",
  "batch_id": "...",
  "readings_count": 10,
  "emissions_total": 55
}
```

The event type is:

```text
measurement.batch_ingested
```

The aggregate type is:

```text
site
```

The aggregate id is the site id.

That gives a downstream worker a stable way to route and process the event.

### Current Worker Boundary

The outbox worker is intentionally stubbed because no real alerting transport has been selected for this take-home. The important implemented part is the transactional boundary: an event is durably recorded in the same commit as the measurement batch.

This is more honest than pretending to notify a fake service inline. The production-ready next step would be to implement a worker that:

1. Polls pending outbox events.
2. Marks a batch of events as processing.
3. Calls the alerting transport.
4. Marks successful events as processed.
5. Increments attempts and schedules retry for failed events.
6. Moves repeatedly failing events to a dead-letter state or operational queue.

The schema already includes status, attempts, `next_attempt_at`, and `processed_at`, so the persistence model supports that extension.

### Why The Outbox Is In The Same Transaction

The outbox only works if the event is written in the same transaction as the state change that produced it.

In this codebase, the ingestion processor passes the same transaction client to:

- batch creation
- measurement insertion
- site total increment
- outbox event creation

That means the outbox event is not best-effort application state. It is part of the ingestion commit.

### Relationship To Idempotency

The outbox event is created only for the first accepted batch.

When the same request is retried with the same idempotency key and same payload, the backend returns `duplicate: true` and does not create another measurement batch. Since no new measurement batch is created, no new outbox event is created either.

This matters because retries should not spam downstream alerting systems.

For a given idempotent batch:

```text
first accepted request -> one batch, one measurement set, one outbox event
identical retry -> duplicate response, no new outbox event
conflicting retry -> 409 conflict, no new outbox event
```

## How The Three Practices Work Together

These three bonus items are not isolated features. They reinforce each other.

### Concurrency Control Protects The Aggregate

The site row lock ensures that concurrent same-site writers do not corrupt the denormalized total.

### Command/Processor Keeps The Workflow Understandable

The processor makes the order of operations visible:

```text
lock -> batch -> measurements -> total -> outbox
```

That sequence is the core of the system. It is not hidden behind generic helpers or spread across multiple controllers.

### Transactional Outbox Preserves Future Integration Reliability

The outbox means the platform can later notify alerting or analytics systems without weakening ingestion correctness. The event is committed with the data, then delivered asynchronously.

Together, these choices produce a stable ingestion contract:

```text
accepted batch
  -> raw measurements committed
  -> site total updated exactly once
  -> downstream notification intent committed
```

## Summary

This take-home implements three Senior/Lead bonus items in the core ingestion path:

1. Concurrency control through pessimistic PostgreSQL row locking and atomic increments.
2. A scalable Command/Processor architecture around the highest-risk workflow.
3. A transactional outbox event written in the same commit as measurements and site totals.

The important point is that these are not decorative additions. They are directly tied to the platform's core correctness requirement: field measurements must be accepted reliably without duplicate records, lost updates, or double-counted emissions.
