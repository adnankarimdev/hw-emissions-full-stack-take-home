export const apiEndpoints = {
  sites: "/sites",
  siteEmissionsTrend: (siteId: string, days: number) =>
    `/sites/${siteId}/emissions-trend?days=${days}`,
  siteMetrics: (siteId: string) => `/sites/${siteId}/metrics`,
  ingest: "/ingest",
  chatSessions: "/chat/sessions",
  chatLatestSession: "/chat/sessions/latest",
  chatSession: (chatId: string) =>
    `/chat/sessions/${encodeURIComponent(chatId)}`,
  chatSessionMessages: (chatId: string) =>
    `/chat/sessions/${encodeURIComponent(chatId)}/messages`,
} as const
