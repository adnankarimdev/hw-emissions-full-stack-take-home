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

Query keys live under `lib/api/query-keys.ts` so invalidation remains consistent as create-site and ingestion mutations are added.

Guidelines:

- Keep route files small and server-first unless a page owns interactive server state.
- Put domain-specific UI under `features/*/components`.
- Keep reusable primitives under `components/ui`.
- Avoid broad barrel files; import concrete modules directly.
- Keep API calls behind typed feature-level functions so the NestJS backend can be wired in without leaking transport details into UI components.
