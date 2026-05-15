export type MeasurementReadingDraft = {
  measuredAt: string
  methaneKg: number
  sourceId: string
}

export type IngestionBatchDraft = {
  siteId: string
  idempotencyKey: string
  readings: MeasurementReadingDraft[]
}

export type IngestionResult = {
  batchId: string
  acceptedCount: number
  duplicate: boolean
}
