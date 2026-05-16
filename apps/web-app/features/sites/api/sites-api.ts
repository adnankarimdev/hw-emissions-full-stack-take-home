import { apiEndpoints } from "@/lib/api/endpoints"
import { requestJson } from "@/lib/api/client"
import type { SiteMetrics, SiteSummary } from "@/features/sites/types"
import {
  backendSiteListSchema,
  backendSiteMetricsSchema,
  toSiteMetrics,
  toSiteSummary,
} from "@/features/sites/api/site-contracts"

export async function listSites(): Promise<SiteSummary[]> {
  const sites = await requestJson(apiEndpoints.sites, {
    schema: backendSiteListSchema,
  })

  return sites.map(toSiteSummary)
}

export async function getSiteMetrics(siteId: string): Promise<SiteMetrics> {
  const metrics = await requestJson(apiEndpoints.siteMetrics(siteId), {
    schema: backendSiteMetricsSchema,
  })

  return toSiteMetrics(metrics)
}
