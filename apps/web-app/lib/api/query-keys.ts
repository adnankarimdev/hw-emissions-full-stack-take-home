export const queryKeys = {
  sites: {
    all: ["sites"] as const,
    metrics: (siteId: string) => ["sites", siteId, "metrics"] as const,
  },
} as const
