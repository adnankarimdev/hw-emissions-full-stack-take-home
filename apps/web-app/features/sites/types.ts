export type ComplianceStatus =
  | "within_limit"
  | "approaching_limit"
  | "limit_exceeded"

export type IngestionHealth = "online" | "retrying" | "delayed"

export type SiteSummary = {
  id: string
  name: string
  operator: string
  location: string
  emissionLimitKg: number
  totalEmissionsKg: number
  latestReadingAt: string
  status: ComplianceStatus
  ingestionHealth: IngestionHealth
}

export type SiteMetrics = {
  siteId: string
  totalEmissionsKg: number
  emissionLimitKg: number
  status: ComplianceStatus
}
