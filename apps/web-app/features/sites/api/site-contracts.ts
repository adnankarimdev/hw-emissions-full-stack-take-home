import { z } from "zod"

import type { SiteMetrics, SiteSummary } from "@/features/sites/types"

const complianceStatusSchema = z.enum(["Within Limit", "Limit Exceeded"])
const siteMetadataSchema = z.record(z.string(), z.unknown()).catch({})

export const backendSiteSchema = z.object({
  id: z.string(),
  name: z.string(),
  emission_limit: z.coerce.number(),
  total_emissions_to_date: z.coerce.number(),
  metadata: siteMetadataSchema,
  latest_reading_at: z.string().nullable().optional(),
  compliance_status: complianceStatusSchema,
})

export const backendSiteListSchema = z.array(backendSiteSchema)

export const backendSiteMetricsSchema = z.object({
  site_id: z.string(),
  emission_limit: z.coerce.number(),
  total_emissions_to_date: z.coerce.number(),
  compliance_status: complianceStatusSchema,
})

type BackendSite = z.infer<typeof backendSiteSchema>
type BackendSiteMetrics = z.infer<typeof backendSiteMetricsSchema>

export function toSiteSummary(site: BackendSite): SiteSummary {
  return {
    id: site.id,
    name: site.name,
    operator: readMetadataString(site.metadata, "operator") ?? "Unassigned",
    location: readMetadataString(site.metadata, "location") ?? "Unknown",
    emissionLimitKg: site.emission_limit,
    totalEmissionsKg: site.total_emissions_to_date,
    latestReadingAt: site.latest_reading_at ?? null,
    status: site.compliance_status,
    ingestionHealth: "online",
  }
}

export function toSiteMetrics(metrics: BackendSiteMetrics): SiteMetrics {
  return {
    siteId: metrics.site_id,
    emissionLimitKg: metrics.emission_limit,
    totalEmissionsKg: metrics.total_emissions_to_date,
    status: metrics.compliance_status,
  }
}

function readMetadataString(
  metadata: Record<string, unknown>,
  key: string
): string | null {
  const value = metadata[key]

  return typeof value === "string" && value.trim().length > 0
    ? value
    : null
}
