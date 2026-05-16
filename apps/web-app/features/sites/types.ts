export type ComplianceStatus = "Within Limit" | "Limit Exceeded"

export type IngestionHealth = "online" | "retrying" | "delayed"

export type SiteSummary = {
  id: string
  name: string
  operator: string
  location: string
  emissionLimitKg: number
  totalEmissionsKg: number
  latestReadingAt: string | null
  status: ComplianceStatus
  ingestionHealth: IngestionHealth
}

export type CreateSiteInput = {
  name: string
  emissionLimitKg: number
  operator: string
  location: string
}

export type SiteMetrics = {
  siteId: string
  totalEmissionsKg: number
  emissionLimitKg: number
  status: ComplianceStatus
}
