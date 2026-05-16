import { z } from "zod"

import type {
  SiteEmissionsTrend,
  SiteMetrics,
  SiteSummary,
} from "@/features/sites/types"

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

export const backendCreatedSiteSchema = backendSiteSchema
  .omit({
    compliance_status: true,
    latest_reading_at: true,
  })
  .extend({
    created_at: z.string(),
    updated_at: z.string(),
  })

export const backendSiteListSchema = z.array(backendSiteSchema)

export const backendSiteMetricsSchema = z.object({
  site_id: z.string(),
  emission_limit: z.coerce.number(),
  total_emissions_to_date: z.coerce.number(),
  compliance_status: complianceStatusSchema,
})

export const backendSiteEmissionsTrendSchema = z.object({
  site_id: z.string(),
  days: z.coerce.number(),
  start_date: z.string(),
  end_date: z.string(),
  timezone: z.string(),
  points: z.array(
    z.object({
      date: z.string(),
      methane_kg: z.coerce.number(),
      cumulative_emissions_to_date: z.coerce.number(),
      emission_limit: z.coerce.number(),
      compliance_status: complianceStatusSchema,
    })
  ),
})

type BackendSite = z.infer<typeof backendSiteSchema>
type BackendCreatedSite = z.infer<typeof backendCreatedSiteSchema>
type BackendSiteMetrics = z.infer<typeof backendSiteMetricsSchema>
type BackendSiteEmissionsTrend = z.infer<
  typeof backendSiteEmissionsTrendSchema
>

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

export function toCreatedSiteSummary(site: BackendCreatedSite): SiteSummary {
  return toSiteSummary({
    ...site,
    latest_reading_at: null,
    compliance_status:
      site.total_emissions_to_date > site.emission_limit
        ? "Limit Exceeded"
        : "Within Limit",
  })
}

export function toSiteMetrics(metrics: BackendSiteMetrics): SiteMetrics {
  return {
    siteId: metrics.site_id,
    emissionLimitKg: metrics.emission_limit,
    totalEmissionsKg: metrics.total_emissions_to_date,
    status: metrics.compliance_status,
  }
}

export function toSiteEmissionsTrend(
  trend: BackendSiteEmissionsTrend
): SiteEmissionsTrend {
  return {
    siteId: trend.site_id,
    days: trend.days,
    startDate: trend.start_date,
    endDate: trend.end_date,
    timezone: trend.timezone,
    points: trend.points.map((point) => ({
      date: point.date,
      methaneKg: point.methane_kg,
      cumulativeEmissionsKg: point.cumulative_emissions_to_date,
      emissionLimitKg: point.emission_limit,
      status: point.compliance_status,
    })),
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
