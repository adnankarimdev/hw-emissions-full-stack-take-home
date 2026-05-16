import type { DashboardMetric } from "@/features/dashboard/types"
import type { SiteSummary } from "@/features/sites/types"
import { formatKilograms, formatPercent } from "@/lib/format/emissions"

type BuildDashboardMetricsOptions = {
  duplicateRetries: number
}

export function buildDashboardMetrics(
  sites: SiteSummary[],
  options: BuildDashboardMetricsOptions = { duplicateRetries: 0 }
): DashboardMetric[] {
  const totalEmissionsKg = sites.reduce(
    (total, site) => total + site.totalEmissionsKg,
    0
  )
  const sitesWithinLimit = sites.filter(
    (site) => site.status === "Within Limit"
  ).length
  const complianceRate =
    sites.length > 0 ? sitesWithinLimit / sites.length : 0
  const exceededSites = sites.length - sitesWithinLimit

  return [
    {
      id: "total-emissions",
      label: "Total Emissions",
      value: formatKilograms(totalEmissionsKg),
      detail: "Across monitored sites",
      tone: "neutral",
    },
    {
      id: "compliance",
      label: "Compliance",
      value: sites.length > 0 ? formatPercent(complianceRate) : "No sites",
      detail: `${sitesWithinLimit} of ${sites.length} sites within limit`,
      tone: exceededSites > 0 ? "danger" : "success",
    },
    {
      id: "duplicate-retries",
      label: "Duplicate Retries",
      value: String(options.duplicateRetries),
      detail: "Duplicate-safe retries this session",
      tone: options.duplicateRetries > 0 ? "warning" : "neutral",
    },
    {
      id: "active-alerts",
      label: "Active Alerts",
      value: String(exceededSites),
      detail: "Sites currently over limit",
      tone: exceededSites > 0 ? "danger" : "success",
    },
  ]
}
