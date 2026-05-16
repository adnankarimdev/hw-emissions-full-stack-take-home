export const queryKeys = {
  sites: {
    all: ["sites"] as const,
    emissionsTrend: (siteId: string, days: number) =>
      ["sites", siteId, "emissions-trend", days] as const,
    emissionsTrendAll: (siteId: string) =>
      ["sites", siteId, "emissions-trend"] as const,
    metrics: (siteId: string) => ["sites", siteId, "metrics"] as const,
  },
} as const
