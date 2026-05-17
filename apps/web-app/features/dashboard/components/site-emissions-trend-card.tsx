"use client"

import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import {
  ActivityIcon,
  AlertCircleIcon,
  RefreshCwIcon,
} from "lucide-react"
import { Area, AreaChart, CartesianGrid, Line, XAxis, YAxis } from "recharts"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useSiteEmissionsTrendQuery } from "@/features/sites/api/site-queries"
import type { SiteEmissionsTrend, SiteSummary } from "@/features/sites/types"
import { getApiErrorMessage } from "@/lib/api/client"
import { formatKilograms, formatPercent } from "@/lib/format/emissions"

type SiteEmissionsTrendCardProps = {
  children?: ReactNode
  isLoadingSites: boolean
  sites: SiteSummary[]
}

const trendDays = 7

const chartConfig = {
  cumulativeEmissionsKg: {
    label: "Cumulative",
    color: "var(--primary)",
  },
  emissionLimitKg: {
    label: "Limit",
    color: "var(--destructive)",
  },
} satisfies ChartConfig

export function SiteEmissionsTrendCard({
  children,
  isLoadingSites,
  sites,
}: SiteEmissionsTrendCardProps) {
  const [selectedSiteId, setSelectedSiteId] = useState("")
  const effectiveSiteId = hasSite(sites, selectedSiteId)
    ? selectedSiteId
    : sites[0]?.id ?? ""
  const selectedSite = useMemo(
    () => sites.find((site) => site.id === effectiveSiteId) ?? null,
    [effectiveSiteId, sites]
  )
  const trendQuery = useSiteEmissionsTrendQuery(effectiveSiteId, trendDays)

  return (
    <Card className="self-start overflow-x-auto">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ActivityIcon className="size-4 text-muted-foreground" />
              <CardTitle>Site Emissions Trend</CardTitle>
            </div>
            <CardDescription>
              Cumulative site emissions against configured limit
            </CardDescription>
          </div>
          {isLoadingSites ? (
            <Skeleton className="h-9 w-full md:w-56" />
          ) : (
            <Select
              value={effectiveSiteId}
              onValueChange={setSelectedSiteId}
              disabled={sites.length === 0}
            >
              <SelectTrigger className="w-full md:w-56">
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
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-5">
          {sites.length === 0 && !isLoadingSites ? (
            <EmptyTrendState />
          ) : trendQuery.isError ? (
            <TrendErrorState
              message={getApiErrorMessage(trendQuery.error)}
              onRetry={() => void trendQuery.refetch()}
            />
          ) : trendQuery.isPending || isLoadingSites ? (
            <TrendSkeleton />
          ) : trendQuery.data ? (
            <TrendContent
              siteName={selectedSite?.name}
              trend={trendQuery.data}
            />
          ) : null}
          {children}
        </div>
      </CardContent>
    </Card>
  )
}

type TrendContentProps = {
  siteName?: string
  trend: SiteEmissionsTrend
}

function TrendContent({ siteName, trend }: TrendContentProps) {
  const latestPoint = trend.points.at(-1)
  const windowEmissionsKg = trend.points.reduce(
    (total, point) => total + point.methaneKg,
    0
  )
  const limitUsed =
    latestPoint && latestPoint.emissionLimitKg > 0
      ? latestPoint.cumulativeEmissionsKg / latestPoint.emissionLimitKg
      : 0

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <TrendStat
          label={`${trend.days}-day total`}
          value={formatKilograms(windowEmissionsKg)}
        />
        <TrendStat
          label="Current total"
          value={formatKilograms(latestPoint?.cumulativeEmissionsKg ?? 0)}
        />
        <TrendStat label="Limit used" value={formatPercent(limitUsed)} />
      </div>
      <ChartContainer config={chartConfig} className="h-[300px] w-full">
        <AreaChart data={trend.points} margin={{ left: 8, right: 8 }}>
          <defs>
            <linearGradient id="cumulative-fill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-cumulativeEmissionsKg)"
                stopOpacity={0.35}
              />
              <stop
                offset="95%"
                stopColor="var(--color-cumulativeEmissionsKg)"
                stopOpacity={0.04}
              />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={formatDateTick}
          />
          <YAxis
            width={60}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatAxisKilograms(Number(value))}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <Area
            dataKey="cumulativeEmissionsKg"
            type="natural"
            fill="url(#cumulative-fill)"
            stroke="var(--color-cumulativeEmissionsKg)"
          />
          <Line
            dataKey="emissionLimitKg"
            type="monotone"
            stroke="var(--color-emissionLimitKg)"
            strokeDasharray="4 4"
            dot={false}
          />
        </AreaChart>
      </ChartContainer>
      <p className="text-xs text-muted-foreground">
        {siteName ?? "Selected site"} from {formatDateLabel(trend.startDate)} to{" "}
        {formatDateLabel(trend.endDate)}. Dates are grouped in {trend.timezone}.
      </p>
    </div>
  )
}

function TrendStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function TrendSkeleton() {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <Skeleton className="h-[300px]" />
    </div>
  )
}

function EmptyTrendState() {
  return (
    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
      Create a site and submit readings to view a real emissions trend.
    </div>
  )
}

type TrendErrorStateProps = {
  message: string
  onRetry: () => void
}

function TrendErrorState({ message, onRetry }: TrendErrorStateProps) {
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
      <div className="flex items-start gap-2">
        <AlertCircleIcon className="mt-0.5 size-4 text-destructive" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Unable to load trend</p>
          <p className="text-xs text-muted-foreground">{message}</p>
        </div>
        <Button type="button" variant="outline" size="icon-sm" onClick={onRetry}>
          <RefreshCwIcon />
          <span className="sr-only">Retry trend</span>
        </Button>
      </div>
    </div>
  )
}

function formatDateTick(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
}

function formatDateLabel(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
}

function formatAxisKilograms(value: number) {
  if (Math.abs(value) >= 1000) {
    return `${Number((value / 1000).toFixed(1))}k`
  }

  return String(value)
}

function hasSite(sites: SiteSummary[], siteId: string) {
  return sites.some((site) => site.id === siteId)
}
