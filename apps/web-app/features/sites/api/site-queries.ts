import { queryOptions, useQuery } from "@tanstack/react-query"

import { listSites } from "@/features/sites/api/sites-api"
import { queryKeys } from "@/lib/api/query-keys"

export const sitesQueryOptions = queryOptions({
  queryKey: queryKeys.sites.all,
  queryFn: listSites,
})

export function useSitesQuery() {
  return useQuery(sitesQueryOptions)
}
