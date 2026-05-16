"use client"

import { useCallback, useState } from "react"
import { AlertCircleIcon, RefreshCwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { DashboardSummaryCards } from "@/features/dashboard/components/dashboard-summary-cards"
import { ManualIngestionForm } from "@/features/ingestion/components/manual-ingestion-form"
import { SiteEmissionsTrendCard } from "@/features/dashboard/components/site-emissions-trend-card"
import { SitesOverviewTable } from "@/features/dashboard/components/sites-overview-table"
import { buildDashboardMetrics } from "@/features/dashboard/lib/dashboard-metrics"
import type { IngestionResult } from "@/features/ingestion/types"
import { useSitesQuery } from "@/features/sites/api/site-queries"
import { CreateSiteForm } from "@/features/sites/components/create-site-form"
import { SiteMetricsPanel } from "@/features/sites/components/site-metrics-panel"
import { getApiErrorMessage } from "@/lib/api/client"

export function DashboardPage() {
  const [duplicateRetryCount, setDuplicateRetryCount] = useState(0)
  const sitesQuery = useSitesQuery()
  const sites = sitesQuery.data ?? []
  const metrics = buildDashboardMetrics(sites, {
    duplicateRetries: duplicateRetryCount,
  })
  const handleIngestionSuccess = useCallback((result: IngestionResult) => {
    if (result.duplicate) {
      setDuplicateRetryCount((current) => current + 1)
    }
  }, [])

  return (
    <DashboardShell title="Monitoring Dashboard">
      <main className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
          {sitesQuery.isError ? (
            <DashboardErrorState
              message={getApiErrorMessage(sitesQuery.error)}
              onRetry={() => void sitesQuery.refetch()}
            />
          ) : null}
          <DashboardSummaryCards
            isLoading={sitesQuery.isPending}
            metrics={metrics}
          />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <SiteEmissionsTrendCard
              isLoadingSites={sitesQuery.isPending}
              sites={sites}
            />
            <div className="grid gap-4">
              <SiteMetricsPanel sites={sites} />
              <CreateSiteForm />
              <ManualIngestionForm
                onIngestionSuccess={handleIngestionSuccess}
                sites={sites}
              />
            </div>
          </div>
          <SitesOverviewTable isLoading={sitesQuery.isPending} sites={sites} />
        </div>
      </main>
    </DashboardShell>
  )
}

type DashboardErrorStateProps = {
  message: string
  onRetry: () => void
}

function DashboardErrorState({ message, onRetry }: DashboardErrorStateProps) {
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex gap-3">
          <AlertCircleIcon className="mt-0.5 size-5 text-destructive" />
          <div>
            <CardTitle className="text-base">Backend unavailable</CardTitle>
            <CardContent className="px-0 pb-0 pt-1 text-sm text-muted-foreground">
              {message}
            </CardContent>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCwIcon />
          Retry
        </Button>
      </CardHeader>
    </Card>
  )
}
