import type { SiteSummary } from "@/features/sites/types"

export type DashboardMetric = {
  id: string
  label: string
  value: string
  detail: string
  tone: "neutral" | "success" | "warning" | "danger"
}

export type EmissionsTrendPoint = {
  date: string
  methaneKg: number
  limitKg: number
}

export type DashboardSnapshot = {
  metrics: DashboardMetric[]
  trend: EmissionsTrendPoint[]
  sites: SiteSummary[]
}
