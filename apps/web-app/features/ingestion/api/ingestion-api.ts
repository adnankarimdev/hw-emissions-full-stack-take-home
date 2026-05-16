import { apiEndpoints } from "@/lib/api/endpoints"
import { requestJson } from "@/lib/api/client"
import type {
  IngestionBatchDraft,
  IngestionResult,
} from "@/features/ingestion/types"
import {
  backendIngestionResultSchema,
  toIngestionResult,
} from "@/features/ingestion/api/ingestion-contracts"

export async function ingestMeasurements(
  batch: IngestionBatchDraft
): Promise<IngestionResult> {
  const result = await requestJson(apiEndpoints.ingest, {
    method: "POST",
    body: JSON.stringify({
      site_id: batch.siteId,
      idempotency_key: batch.idempotencyKey,
      readings: batch.readings.map((reading) => ({
        source_id: reading.sourceId,
        measured_at: reading.measuredAt,
        methane_kg: reading.methaneKg,
        metadata: reading.metadata,
      })),
    }),
    schema: backendIngestionResultSchema,
  })

  return toIngestionResult(result)
}
