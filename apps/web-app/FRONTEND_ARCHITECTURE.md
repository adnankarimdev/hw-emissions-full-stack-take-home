# Frontend Architecture

The web app uses a feature-first Next.js App Router structure. Routes stay thin and delegate page composition to feature modules.

```text
app/
  dashboard/                  route entry points

components/
  layout/                     app shell, sidebar, header, navigation
  ui/                         shadcn/ui primitives only

features/
  dashboard/                  dashboard page composition and read models
  ingestion/                  manual ingestion UI and API integration seam
  sites/                      site status UI, types, and API integration seam

lib/
  api/                        typed HTTP client and endpoint definitions
  config/                     public runtime configuration
  format/                     display formatting helpers
```

Guidelines:

- Keep route files small and server-first.
- Put domain-specific UI under `features/*/components`.
- Keep reusable primitives under `components/ui`.
- Avoid broad barrel files; import concrete modules directly.
- Keep API calls behind typed feature-level functions so the NestJS backend can be wired in without leaking transport details into UI components.
