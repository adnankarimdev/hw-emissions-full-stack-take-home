import { useMutation, useQueryClient } from "@tanstack/react-query"

import { ingestMeasurements } from "@/features/ingestion/api/ingestion-api"
import { queryKeys } from "@/lib/api/query-keys"

export function useIngestMeasurementsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ["ingestion", "manual-batch"],
    mutationFn: ingestMeasurements,
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.sites.all,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.sites.metrics(result.siteId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.sites.emissionsTrendAll(result.siteId),
        }),
      ])
    },
  })
}
