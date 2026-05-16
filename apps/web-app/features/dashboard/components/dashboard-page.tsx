"use client"

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
import { EmissionsTrendPlaceholder } from "@/features/dashboard/components/emissions-trend-placeholder"
import { ManualIngestionForm } from "@/features/ingestion/components/manual-ingestion-form"
import { SitesOverviewTable } from "@/features/dashboard/components/sites-overview-table"
import { buildDashboardMetrics } from "@/features/dashboard/lib/dashboard-metrics"
import { dashboardPlaceholder } from "@/features/dashboard/data/dashboard-placeholder-data"
import { useSitesQuery } from "@/features/sites/api/site-queries"
import { CreateSiteForm } from "@/features/sites/components/create-site-form"

export function DashboardPage() {
  const sitesQuery = useSitesQuery()
  const sites = sitesQuery.data ?? []
  const metrics = buildDashboardMetrics(sites)

  return (
    <DashboardShell title="Monitoring Dashboard">
      <main className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
          {sitesQuery.isError ? (
            <DashboardErrorState onRetry={() => void sitesQuery.refetch()} />
          ) : null}
          <DashboardSummaryCards metrics={metrics} />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <EmissionsTrendPlaceholder data={dashboardPlaceholder.trend} />
            <div className="grid gap-4">
              <CreateSiteForm />
              <ManualIngestionForm sites={sites} />
            </div>
          </div>
          <SitesOverviewTable sites={sites} />
        </div>
      </main>
    </DashboardShell>
  )
}

type DashboardErrorStateProps = {
  onRetry: () => void
}

function DashboardErrorState({ onRetry }: DashboardErrorStateProps) {
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex gap-3">
          <AlertCircleIcon className="mt-0.5 size-5 text-destructive" />
          <div>
            <CardTitle className="text-base">Backend unavailable</CardTitle>
            <CardContent className="px-0 pb-0 pt-1 text-sm text-muted-foreground">
              Start the API and database, then retry the dashboard request.
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
