# Frontend Architecture

The web app uses a feature-first Next.js App Router structure. Routes stay thin and delegate page composition to feature modules.

```text
app/
  dashboard/                  route entry points
  providers.tsx               client-side provider composition

components/
  layout/                     app shell, sidebar, header, navigation
  ui/                         shadcn/ui primitives only

features/
  dashboard/                  dashboard page composition and read models
  ingestion/                  manual ingestion UI and API integration seam
  sites/                      site status UI, API contracts, queries, and types

lib/
  api/                        typed HTTP client, endpoint definitions, query keys
  config/                     public runtime configuration
  format/                     display formatting helpers
```

## Server State

The frontend uses TanStack Query for interactive server state. Next.js routes and layout components stay focused on composition, while client components call feature-level hooks.

```text
Client component
  -> feature query or mutation hook
  -> feature API function
  -> shared API client
  -> NestJS API
```

The shared API client unwraps the backend response envelope and validates response data with Zod schemas at the frontend boundary. Components receive normalized camelCase view models instead of raw transport payloads.

Query keys live under `lib/api/query-keys.ts` so invalidation remains consistent. Create-site and ingestion mutations invalidate the sites query after success instead of manually patching unrelated component state.

The site metrics panel calls `GET /sites/:id/metrics` directly through `useSiteMetricsQuery`. The manual ingestion form preserves the submitted batch payload and idempotency key for retry actions. Retrying uses the exact same request body so the backend can demonstrate duplicate-safe handling without the frontend inventing its own deduplication behavior.

## Resilience UX

Dashboard reads expose explicit loading, empty, and error states. Initial site loading renders skeleton rows and metric placeholders so zero-valued operational data is not confused with data that has not loaded yet.

Manual ingestion keeps the last submitted `IngestionBatchDraft` separate from editable form state. This lets an operator change the form while the retry action still resends the exact retained payload and idempotency key from the previous attempt. Successful duplicate retries are surfaced in the dashboard summary as session-level retry telemetry, while backend totals remain the source of truth.

Guidelines:

- Keep route files small and server-first unless a page owns interactive server state.
- Put domain-specific UI under `features/*/components`.
- Keep reusable primitives under `components/ui`.
- Avoid broad barrel files; import concrete modules directly.
- Keep API calls behind typed feature-level functions so the NestJS backend can be wired in without leaking transport details into UI components.
