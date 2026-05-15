import { DashboardShell } from "@/components/layout/dashboard-shell"
import { DashboardSummaryCards } from "@/features/dashboard/components/dashboard-summary-cards"
import { EmissionsTrendPlaceholder } from "@/features/dashboard/components/emissions-trend-placeholder"
import { ManualIngestionFormPlaceholder } from "@/features/ingestion/components/manual-ingestion-form-placeholder"
import { SitesOverviewTable } from "@/features/dashboard/components/sites-overview-table"
import { dashboardPlaceholder } from "@/features/dashboard/data/dashboard-placeholder-data"

export function DashboardPage() {
  return (
    <DashboardShell title="Monitoring Dashboard">
      <main className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
          <DashboardSummaryCards metrics={dashboardPlaceholder.metrics} />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <EmissionsTrendPlaceholder data={dashboardPlaceholder.trend} />
            <ManualIngestionFormPlaceholder sites={dashboardPlaceholder.sites} />
          </div>
          <SitesOverviewTable sites={dashboardPlaceholder.sites} />
        </div>
      </main>
    </DashboardShell>
  )
}
