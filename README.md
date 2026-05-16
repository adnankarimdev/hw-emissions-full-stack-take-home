# Highwood Emissions Platform

Full-stack emissions ingestion and monitoring platform for the Highwood take-home challenge.

The implementation focuses on the hard part of the prompt: accepting methane readings from unreliable field clients without duplicating raw measurements or double-counting a site's emissions total.

## What Is Built

- `POST /sites` creates monitored industrial sites with an `emission_limit` and flexible metadata.
- `POST /ingest` accepts methane reading batches, persists raw measurements, updates site totals atomically, and supports duplicate-safe retries through idempotency keys.
- `GET /sites/:id/metrics` returns compliance metrics for a site.
- `GET /sites/:id/emissions-trend` returns a real per-site emissions time series from persisted measurements.
- The dashboard lists sites, shows compliance metrics, graphs per-site cumulative emissions, supports manual ingestion, and demonstrates retry behavior without double-counting.
- The operations chat lets an admin ask for live metrics, render dashboard widgets, create sites, and access ingestion workflows through a constrained AI-rendered UI.
- Successful and error API responses use a consistent platform envelope.
- Backend architecture uses NestJS modules, service/repository boundaries, a Command/Processor workflow for ingestion, Prisma transactions, and a transactional outbox table.

## Tech Stack

- Frontend: Next.js App Router, React, TypeScript, shadcn/ui, AI SDK, AI Elements, TanStack Query, Zod
- Backend: NestJS, TypeScript, Prisma, Zod
- Database: PostgreSQL
- Tooling: pnpm workspace, Docker Compose, Jest
- Optional local infrastructure: Redis and pgAdmin are included in `docker-compose.yml`

## Repository Structure

```text
apps/
  api-server/                 NestJS API, Prisma schema, migrations, tests
    prisma/
    src/modules/
    src/shared/

  web-app/                    Next.js dashboard
    app/
    components/
    features/
    lib/

docker-compose.yml            local Postgres, Redis, optional pgAdmin
package.json                  root pnpm workspace scripts
```

Architecture notes:

- Backend: [apps/api-server/BACKEND_ARCHITECTURE.md](apps/api-server/BACKEND_ARCHITECTURE.md)
- Frontend: [apps/web-app/FRONTEND_ARCHITECTURE.md](apps/web-app/FRONTEND_ARCHITECTURE.md)

## Prerequisites

- Node.js 20+
- pnpm 10.x
- Docker Desktop or another Docker runtime

This repository is managed as a pnpm workspace. Use pnpm from the repository root; do not mix npm lockfiles into the apps.

## Quick Start

Run these commands from the repository root.

```bash
# 1. Install dependencies
pnpm install

# 2. Create environment files
cp .env.example .env
cp apps/api-server/.env.example apps/api-server/.env

# 3. Start local infrastructure
docker compose up -d postgres redis

# 4. Apply database migrations
pnpm prisma:migrate
```

Start the API in one terminal:

```bash
pnpm dev:api
```

Start the web app in a second terminal:

```bash
pnpm dev:web
```

Open the dashboard:

```text
http://localhost:3000/dashboard
```

By default, the API runs at `http://localhost:3001` and the web app reads from that URL. If you deploy or run the API elsewhere, set `NEXT_PUBLIC_API_BASE_URL` for the web app.

To use the operations chat, add an AI Gateway key to `apps/web-app/.env.local` or your Vercel project settings:

```bash
AI_GATEWAY_API_KEY=your_gateway_key
# Optional:
AI_GATEWAY_MODEL=openai/gpt-5.5
```

Operations chat conversations are persisted through the NestJS backend into Postgres. Run migrations before using chat locally so the `chat_sessions` and `chat_messages` tables exist:

```bash
pnpm prisma:migrate
```

Optional DB admin UI:

```bash
docker compose --profile tools up -d
```

pgAdmin is available at `http://localhost:5050` using the credentials in `.env`.

## Demo Script

Use this flow to demonstrate the key product and data-integrity behavior.

1. Open `http://localhost:3000/dashboard`.
2. Create a site with a name, emission limit, operator, and location.
3. Use the graph dropdown to select that site.
4. In **Manual Ingestion**, submit a methane reading batch for that site.
5. Confirm the dashboard total, per-site emissions graph, site metrics, and site performance table all increase by the submitted methane amount.
6. Click **Retry Last Batch**.
7. Confirm the UI reports the batch as a duplicate-safe retry.
8. Confirm the site total does not increase on retry.
9. Confirm the **Duplicate Retries** summary card increments for the session.

Optional chat flow:

1. Open `http://localhost:3000/chat`.
2. Ask for the dashboard overview or a per-site trend; the assistant renders existing dashboard widgets in the conversation.
3. Ask to create a site or submit readings; the assistant asks for missing fields before using mutation tools.

The important behavior is that retry sends the exact retained batch payload and idempotency key. The backend returns `duplicate: true` for an identical retry and does not create duplicate measurements or increment `total_emissions_to_date` again.

## API Endpoints

### Create Site

```http
POST /sites
```

```json
{
  "name": "Bear Creek Pad 14",
  "emission_limit": 12000,
  "metadata": {
    "operator": "North Ridge Energy",
    "location": "Grande Prairie, AB"
  }
}
```

### Ingest Measurements

```http
POST /ingest
```

```json
{
  "site_id": "site-id",
  "idempotency_key": "device-123-batch-001",
  "readings": [
    {
      "source_id": "sensor-north-7",
      "measured_at": "2026-05-16T06:30:00.000Z",
      "methane_kg": 126,
      "metadata": {
        "submitted_by": "manual-dashboard"
      }
    }
  ]
}
```

### Site Metrics

```http
GET /sites/:id/metrics
```

### Site Emissions Trend

```http
GET /sites/:id/emissions-trend?days=7
```

Returns UTC daily points for one site. Each point includes the daily methane total, cumulative emissions to date, the configured site limit, and the compliance status at that point in the time series.

## Testing

Run unit tests:

```bash
pnpm test
```

Run backend e2e tests:

```bash
docker compose up -d postgres
pnpm prisma:migrate
pnpm --filter ./apps/api-server test:e2e
```

Run backend coverage:

```bash
pnpm --filter ./apps/api-server test:cov
```

Before submitting changes, run the full verification pass:

```bash
pnpm test
pnpm --filter ./apps/api-server test:e2e
pnpm lint
pnpm build
```

## Requirement Checklist

| Requirement | Status | Notes |
| --- | --- | --- |
| `POST /sites` asset management | Implemented | Stores `emission_limit`, metadata, and denormalized total. |
| Unified API responses/errors | Implemented | Global response interceptor and exception filter. |
| `POST /ingest` batch ingestion | Implemented | Accepts up to 100 readings through Zod validation. |
| Atomic transaction | Implemented | Batch row, measurements, site total increment, and outbox event are written in one Prisma transaction. |
| Retry/network resilience | Implemented | Unique `(site_id, idempotency_key)` plus request hash prevents duplicate records and double-counting. |
| `GET /sites/:id/metrics` analytics | Implemented | Computes compliance status from current total and limit. |
| `GET /sites/:id/emissions-trend` analytics | Implemented | Builds a per-site UTC daily trend from persisted measurements. |
| Monitoring dashboard | Implemented | Real per-site trend graph, site list, metrics panel, create-site form, manual ingestion form, retry UX. |
| Operations chat | Implemented | AI SDK route, Postgres-backed sessions, constrained renderer catalog, dashboard read tools, create-site and ingestion tools. |
| Command/Processor architecture | Implemented | Ingestion workflow is modeled as command plus processor. |
| Transactional outbox | Implemented | Outbox event is written in the ingestion transaction. |
| Concurrency protection | Implemented | Site totals use database-level atomic increment inside the transaction. |
| Type-safe boundaries | Implemented | Backend and frontend validate API inputs/outputs with Zod schemas. |
| Tests | Implemented | Backend unit tests and e2e test cover idempotency and metrics. |

## Key Tradeoffs

- `total_emissions_to_date` is denormalized on `sites` for fast dashboard and metrics reads, while `measurements` remain the auditable source records.
- The trend endpoint uses `measurements` as the source of truth and includes a baseline before the selected window, so cumulative graph values stay consistent even when the requested window is shorter than the site's full history.
- Compliance status is computed at read time instead of persisted, avoiding stale status when limits or totals change.
- Idempotency is enforced in the database, not only in application memory, so retries remain safe across server restarts or multiple API instances.
- The frontend tracks duplicate retries as session-level demo telemetry. Backend totals and persisted batch records remain the source of truth.
- Redis is available locally but not required for the core correctness path; PostgreSQL constraints and transactions handle idempotency and atomicity.

## Useful Commands

```bash
# Install dependencies
pnpm install

# Start API
pnpm dev:api

# Start web app
pnpm dev:web

# Generate Prisma client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# Open Prisma Studio
pnpm prisma:studio

# Lint all apps
pnpm lint

# Build all apps
pnpm build
```
