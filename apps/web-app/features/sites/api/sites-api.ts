import { apiEndpoints } from "@/lib/api/endpoints"
import { requestJson } from "@/lib/api/client"
import type {
  CreateSiteInput,
  SiteMetrics,
  SiteSummary,
} from "@/features/sites/types"
import {
  backendCreatedSiteSchema,
  backendSiteListSchema,
  backendSiteMetricsSchema,
  toCreatedSiteSummary,
  toSiteMetrics,
  toSiteSummary,
} from "@/features/sites/api/site-contracts"

export async function createSite(
  input: CreateSiteInput
): Promise<SiteSummary> {
  const site = await requestJson(apiEndpoints.sites, {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      emission_limit: input.emissionLimitKg,
      metadata: {
        location: input.location,
        operator: input.operator,
      },
    }),
    schema: backendCreatedSiteSchema,
  })

  return toCreatedSiteSummary(site)
}

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
