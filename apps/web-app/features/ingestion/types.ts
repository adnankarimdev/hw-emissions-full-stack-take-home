export type MeasurementReadingDraft = {
  measuredAt: string
  methaneKg: number
  sourceId: string
  metadata?: Record<string, unknown>
}

export type IngestionBatchDraft = {
  siteId: string
  idempotencyKey: string
  readings: MeasurementReadingDraft[]
}

export type IngestionResult = {
  batchId: string
  siteId: string
  acceptedCount: number
  duplicate: boolean
  totalEmissionsToDate: number
  complianceStatus: "Within Limit" | "Limit Exceeded"
}
