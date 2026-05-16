import { z } from "zod"

import type { IngestionResult } from "@/features/ingestion/types"

export const backendIngestionResultSchema = z.object({
  batch_id: z.string(),
  site_id: z.string(),
  readings_accepted: z.coerce.number(),
  duplicate: z.boolean(),
  total_emissions_to_date: z.coerce.number(),
  compliance_status: z.enum(["Within Limit", "Limit Exceeded"]),
})

type BackendIngestionResult = z.infer<typeof backendIngestionResultSchema>

export function toIngestionResult(
  result: BackendIngestionResult
): IngestionResult {
  return {
    batchId: result.batch_id,
    siteId: result.site_id,
    acceptedCount: result.readings_accepted,
    duplicate: result.duplicate,
    totalEmissionsToDate: result.total_emissions_to_date,
    complianceStatus: result.compliance_status,
  }
}
