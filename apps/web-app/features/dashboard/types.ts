export type DashboardMetric = {
  id: string
  label: string
  value: string
  detail: string
  tone: "neutral" | "success" | "warning" | "danger"
}
