import { useMutation, useQueryClient } from "@tanstack/react-query"

import { createSite } from "@/features/sites/api/sites-api"
import { queryKeys } from "@/lib/api/query-keys"

export function useCreateSiteMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ["sites", "create"],
    mutationFn: createSite,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.sites.all,
      })
    },
  })
}
