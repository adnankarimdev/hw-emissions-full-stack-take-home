export const apiEndpoints = {
  sites: "/sites",
  siteEmissionsTrend: (siteId: string, days: number) =>
    `/sites/${siteId}/emissions-trend?days=${days}`,
  siteMetrics: (siteId: string) => `/sites/${siteId}/metrics`,
  ingest: "/ingest",
} as const
