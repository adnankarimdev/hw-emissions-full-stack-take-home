"use client"

import { useMemo, useState } from "react"
import {
  AlertCircleIcon,
  BarChart3Icon,
  RefreshCwIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useSiteMetricsQuery } from "@/features/sites/api/site-queries"
import { SiteStatusBadge } from "@/features/sites/components/site-status-badge"
import type { SiteSummary } from "@/features/sites/types"
import { getApiErrorMessage } from "@/lib/api/client"
import { formatKilograms, formatPercent } from "@/lib/format/emissions"

type SiteMetricsPanelProps = {
  sites: SiteSummary[]
}

export function SiteMetricsPanel({ sites }: SiteMetricsPanelProps) {
  const [selectedSiteId, setSelectedSiteId] = useState("")
  const effectiveSiteId = hasSite(sites, selectedSiteId)
    ? selectedSiteId
    : sites[0]?.id ?? ""
  const selectedSite = useMemo(
    () => sites.find((site) => site.id === effectiveSiteId) ?? null,
    [effectiveSiteId, sites]
  )
  const metricsQuery = useSiteMetricsQuery(effectiveSiteId)

  return (
    <Card id="metrics">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3Icon className="size-4 text-muted-foreground" />
          <CardTitle>Site Metrics</CardTitle>
        </div>
        <CardDescription>Compliance summary from the metrics endpoint</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {sites.length === 0 ? (
          <EmptyMetricsState />
        ) : (
          <>
            <Select value={effectiveSiteId} onValueChange={setSelectedSiteId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select site" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {metricsQuery.isError ? (
              <MetricsErrorState
                message={getApiErrorMessage(metricsQuery.error)}
                onRetry={() => void metricsQuery.refetch()}
              />
            ) : null}
            {metricsQuery.isPending ? (
              <MetricsSkeleton />
            ) : metricsQuery.data ? (
              <MetricsContent
                siteName={selectedSite?.name ?? "Selected site"}
                totalEmissionsKg={metricsQuery.data.totalEmissionsKg}
                emissionLimitKg={metricsQuery.data.emissionLimitKg}
                status={metricsQuery.data.status}
              />
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}

type MetricsContentProps = {
  emissionLimitKg: number
  siteName: string
  status: SiteSummary["status"]
  totalEmissionsKg: number
}

function MetricsContent({
  emissionLimitKg,
  siteName,
  status,
  totalEmissionsKg,
}: MetricsContentProps) {
  const limitUsed = totalEmissionsKg / emissionLimitKg

  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-3 rounded-md border bg-muted/30 p-3">
        <div>
          <p className="text-sm font-medium">{siteName}</p>
          <p className="text-xs text-muted-foreground">
            Compliance is computed from current total and limit
          </p>
        </div>
        <SiteStatusBadge status={status} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MetricValue label="Total" value={formatKilograms(totalEmissionsKg)} />
        <MetricValue label="Limit" value={formatKilograms(emissionLimitKg)} />
        <MetricValue label="Limit Used" value={formatPercent(limitUsed)} />
        <MetricValue
          label="Remaining"
          value={formatKilograms(Math.max(emissionLimitKg - totalEmissionsKg, 0))}
        />
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.min(limitUsed * 100, 100)}%` }}
        />
      </div>
    </div>
  )
}

type MetricValueProps = {
  label: string
  value: string
}

function MetricValue({ label, value }: MetricValueProps) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function MetricsSkeleton() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-20" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    </div>
  )
}

function EmptyMetricsState() {
  return (
    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
      Create a site to view compliance metrics.
    </div>
  )
}

type MetricsErrorStateProps = {
  message: string
  onRetry: () => void
}

function MetricsErrorState({ message, onRetry }: MetricsErrorStateProps) {
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
      <div className="flex items-start gap-2">
        <AlertCircleIcon className="mt-0.5 size-4 text-destructive" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Unable to load metrics</p>
          <p className="text-xs text-muted-foreground">{message}</p>
        </div>
        <Button type="button" variant="outline" size="icon-sm" onClick={onRetry}>
          <RefreshCwIcon />
          <span className="sr-only">Retry metrics</span>
        </Button>
      </div>
    </div>
  )
}

function hasSite(sites: SiteSummary[], siteId: string) {
  return sites.some((site) => site.id === siteId)
}
