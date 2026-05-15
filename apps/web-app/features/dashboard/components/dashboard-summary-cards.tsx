import {
  AlertTriangleIcon,
  BadgeCheckIcon,
  GaugeIcon,
  RadioTowerIcon,
} from "lucide-react"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { DashboardMetric } from "@/features/dashboard/types"

type DashboardSummaryCardsProps = {
  metrics: DashboardMetric[]
}

const iconByMetricId = {
  "total-emissions": GaugeIcon,
  compliance: BadgeCheckIcon,
  "duplicate-retries": RadioTowerIcon,
  "active-alerts": AlertTriangleIcon,
} as const

const toneClassName: Record<DashboardMetric["tone"], string> = {
  neutral: "text-muted-foreground",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-destructive",
}

export function DashboardSummaryCards({ metrics }: DashboardSummaryCardsProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = iconByMetricId[metric.id as keyof typeof iconByMetricId]

        return (
          <Card key={metric.id} className="@container/card">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="space-y-1">
                <CardDescription>{metric.label}</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {metric.value}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{metric.detail}</p>
              </div>
              {Icon ? (
                <Icon className={toneClassName[metric.tone]} />
              ) : null}
            </CardHeader>
          </Card>
        )
      })}
    </section>
  )
}
