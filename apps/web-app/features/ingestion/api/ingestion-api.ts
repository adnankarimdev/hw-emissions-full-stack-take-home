import { apiEndpoints } from "@/lib/api/endpoints"
import { requestJson } from "@/lib/api/client"
import type {
  IngestionBatchDraft,
  IngestionResult,
} from "@/features/ingestion/types"

export function ingestMeasurements(batch: IngestionBatchDraft) {
  return requestJson<IngestionResult>(apiEndpoints.ingest, {
    method: "POST",
    body: JSON.stringify(batch),
  })
}
