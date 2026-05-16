import { queryOptions, useQuery } from "@tanstack/react-query"

import {
  getSiteEmissionsTrend,
  getSiteMetrics,
  listSites,
} from "@/features/sites/api/sites-api"
import { queryKeys } from "@/lib/api/query-keys"

export const sitesQueryOptions = queryOptions({
  queryKey: queryKeys.sites.all,
  queryFn: listSites,
})

export function useSitesQuery() {
  return useQuery(sitesQueryOptions)
}

export function useSiteMetricsQuery(siteId: string) {
  return useQuery({
    queryKey: queryKeys.sites.metrics(siteId),
    queryFn: () => getSiteMetrics(siteId),
    enabled: siteId.length > 0,
  })
}

export function useSiteEmissionsTrendQuery(siteId: string, days: number) {
  return useQuery({
    queryKey: queryKeys.sites.emissionsTrend(siteId, days),
    queryFn: () => getSiteEmissionsTrend({ siteId, days }),
    enabled: siteId.length > 0,
  })
}
