export const apiEndpoints = {
  sites: "/sites",
  siteMetrics: (siteId: string) => `/sites/${siteId}/metrics`,
  ingest: "/ingest",
} as const
