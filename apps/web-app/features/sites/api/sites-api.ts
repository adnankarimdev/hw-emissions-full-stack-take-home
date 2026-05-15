import { apiEndpoints } from "@/lib/api/endpoints"
import { requestJson } from "@/lib/api/client"
import type { SiteMetrics, SiteSummary } from "@/features/sites/types"

export function listSites() {
  return requestJson<SiteSummary[]>(apiEndpoints.sites)
}

export function getSiteMetrics(siteId: string) {
  return requestJson<SiteMetrics>(apiEndpoints.siteMetrics(siteId))
}
