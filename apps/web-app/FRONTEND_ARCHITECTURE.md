# Frontend Architecture

The web app uses a feature-first Next.js App Router structure. Routes stay thin and delegate page composition to feature modules.

```text
app/
  dashboard/                  route entry points
  chat/                       persisted operations chat sessions
  api/chat/                   AI SDK streaming route and tool orchestration
  providers.tsx               client-side provider composition

components/
  layout/                     app shell, sidebar, header, navigation
  ui/                         shadcn/ui primitives only
  ai-elements/                AI Elements chat primitives generated into app code

features/
  dashboard/                  dashboard page composition and read models
  chat/                       operations copilot, renderer catalog, tools, persistence
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

The site metrics panel calls `GET /sites/:id/metrics` directly through `useSiteMetricsQuery`. The emissions trend card calls `GET /sites/:id/emissions-trend` through `useSiteEmissionsTrendQuery` and owns its site selector so the graph always represents one explicit asset.

The manual ingestion form preserves the submitted batch payload and idempotency key for retry actions. Retrying uses the exact same request body so the backend can demonstrate duplicate-safe handling without the frontend inventing its own deduplication behavior.

## Resilience UX

Dashboard reads expose explicit loading, empty, and error states. Initial site loading renders skeleton rows and metric placeholders so zero-valued operational data is not confused with data that has not loaded yet.

Manual ingestion keeps the last submitted `IngestionBatchDraft` separate from editable form state. This lets an operator change the form while the retry action still resends the exact retained payload and idempotency key from the previous attempt. Successful duplicate retries are surfaced in the dashboard summary as session-level retry telemetry, while backend totals remain the source of truth.

Successful ingestion invalidates the site list, selected site metrics, and per-site emissions trend query. The graph therefore refreshes from persisted measurements instead of maintaining a separate client-side chart model.

## Operations Chat

The chat experience is intentionally implemented as a feature module rather than as ad hoc route code.

```text
app/chat/[chatId]/page.tsx
  -> features/chat/components/chat-page.tsx
  -> features/chat/components/chat-workspace.tsx
  -> app/api/chat/route.ts
  -> AI SDK tools
  -> existing typed feature API clients
  -> NestJS API
```

The chat route uses the Vercel AI SDK with AI Gateway. The model id defaults to `openai/gpt-5.5` and can be overridden with `AI_GATEWAY_MODEL`; authentication is handled by `AI_GATEWAY_API_KEY` in the web app environment.

The assistant is not allowed to render arbitrary React. It can call a `renderDashboardUi` tool with a constrained `@json-render/react` spec, and that spec can only reference the local renderer catalog:

- `DashboardOverview`
- `SummaryCards`
- `SitesTable`
- `SiteTrend`
- `SiteMetrics`
- `CreateSiteForm`
- `ManualIngestionForm`
- small layout primitives: `Stack`, `Surface`, `Text`, `Notice`

Those renderer entries are adapters over existing dashboard, site, and ingestion components. The rendered chat UI therefore uses the same forms, TanStack Query hooks, Zod-validated API clients, loading states, and cache invalidation behavior as the normal dashboard. The model can choose what to show, but it cannot invent a new visual component or bypass frontend domain boundaries.

AI tools follow the same rule: data reads and writes go through the existing feature API clients. `createSite` and `ingestMeasurements` are exposed as explicit mutation tools, and the system prompt requires missing fields and user intent to be resolved before either tool is called. The ingestion tool preserves the platform idempotency contract by requiring an idempotency key and a bounded batch of 1 to 100 readings.

Chat sessions are persisted through `features/chat/server/chat-store.ts`. The current adapter writes JSON under `.data/chats` so local conversations survive app restarts and browser sessions during the take-home review. That directory is git-ignored. For a production Vercel deployment, this adapter should be replaced with a durable store such as the existing Postgres backend because serverless filesystem writes are not a persistence boundary.

Guidelines:

- Keep route files small and server-first unless a page owns interactive server state.
- Put domain-specific UI under `features/*/components`.
- Keep reusable primitives under `components/ui`.
- Avoid broad barrel files; import concrete modules directly.
- Keep API calls behind typed feature-level functions so the NestJS backend can be wired in without leaking transport details into UI components.
