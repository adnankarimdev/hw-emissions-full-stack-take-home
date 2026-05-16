"use client"

import { defineCatalog } from "@json-render/core"
import {
  ActionProvider,
  Renderer,
  StateProvider,
  ValidationProvider,
  VisibilityProvider,
  defineRegistry,
  type Spec,
} from "@json-render/react"
import { schema } from "@json-render/react/schema"
import { AlertCircleIcon, InfoIcon } from "lucide-react"
import { z } from "zod"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardSummaryCards } from "@/features/dashboard/components/dashboard-summary-cards"
import { SiteEmissionsTrendCard } from "@/features/dashboard/components/site-emissions-trend-card"
import { SitesOverviewTable } from "@/features/dashboard/components/sites-overview-table"
import { buildDashboardMetrics } from "@/features/dashboard/lib/dashboard-metrics"
import { ManualIngestionForm } from "@/features/ingestion/components/manual-ingestion-form"
import { useSitesQuery } from "@/features/sites/api/site-queries"
import { CreateSiteForm } from "@/features/sites/components/create-site-form"
import { SiteMetricsPanel } from "@/features/sites/components/site-metrics-panel"
import { cn } from "@/lib/utils"

import type { ChatRenderSpec } from "@/features/chat/renderer/spec"

const toneSchema = z.enum(["neutral", "info", "success", "warning", "danger"])

export const chatRendererCatalog = defineCatalog(schema, {
  components: {
    DashboardOverview: {
      props: z.object({}),
      description:
        "Renders the full monitoring dashboard overview using live site data, including summary cards, trend chart, table, metrics, create-site form, and manual ingestion form.",
    },
    SummaryCards: {
      props: z.object({}),
      description:
        "Renders the dashboard metric cards from live site data.",
    },
    SitesTable: {
      props: z.object({
        variant: z.enum(["card", "embedded"]).default("card"),
      }),
      description:
        "Renders the live monitored-sites performance table.",
    },
    SiteTrend: {
      props: z.object({
        includeSitesTable: z.boolean().default(false),
      }),
      description:
        "Renders the live per-site emissions trend chart with a site selector.",
    },
    SiteMetrics: {
      props: z.object({}),
      description:
        "Renders the live site metrics panel with compliance status.",
    },
    CreateSiteForm: {
      props: z.object({}),
      description:
        "Renders the existing create-site form for registering a monitored industrial asset.",
    },
    ManualIngestionForm: {
      props: z.object({}),
      description:
        "Renders the existing manual ingestion form for submitting methane readings with idempotency.",
    },
    Stack: {
      props: z.object({
        gap: z.enum(["sm", "md", "lg"]).default("md"),
        columns: z.enum(["1", "2"]).default("1"),
      }),
      description:
        "A simple layout container for grouping renderer components.",
    },
    Surface: {
      props: z.object({
        title: z.string().min(1),
        description: z.string().optional(),
      }),
      description:
        "A shadcn card surface for grouping a small amount of supporting text and child components.",
    },
    Text: {
      props: z.object({
        value: z.string().min(1),
        variant: z.enum(["body", "muted", "caption"]).default("body"),
      }),
      description:
        "Plain text for short operational notes inside rendered surfaces.",
    },
    Notice: {
      props: z.object({
        title: z.string().min(1),
        message: z.string().min(1),
        tone: toneSchema.default("info"),
      }),
      description:
        "A compact operational notice for errors, warnings, or confirmations.",
    },
  },
  actions: {},
})

export function ChatRenderedUi({ spec }: { spec: ChatRenderSpec }) {
  return (
    <StateProvider initialState={spec.state ?? {}}>
      <ActionProvider handlers={{}}>
        <ValidationProvider>
          <VisibilityProvider>
            <Renderer
              fallback={UnknownRendererComponent}
              registry={registry}
              spec={spec as Spec}
            />
          </VisibilityProvider>
        </ValidationProvider>
      </ActionProvider>
    </StateProvider>
  )
}

const { registry } = defineRegistry(chatRendererCatalog, {
  components: {
    DashboardOverview: () => <DashboardOverviewRenderer />,
    SummaryCards: () => <SummaryCardsRenderer />,
    SitesTable: ({ props }) => {
      const { variant = "card" } = props as SitesTableProps

      return <SitesTableRenderer variant={variant} />
    },
    SiteTrend: ({ props }) => {
      const { includeSitesTable = false } = props as SiteTrendProps

      return <SiteTrendRenderer includeSitesTable={includeSitesTable} />
    },
    SiteMetrics: () => <SiteMetricsRenderer />,
    CreateSiteForm: () => <CreateSiteForm />,
    ManualIngestionForm: () => <ManualIngestionRenderer />,
    Stack: ({ props, children }) => {
      const { columns = "1", gap = "md" } = props as StackProps

      return (
        <div
          className={cn(
            "grid",
            gap === "sm" && "gap-3",
            gap === "md" && "gap-4",
            gap === "lg" && "gap-6",
            columns === "2" && "xl:grid-cols-2"
          )}
        >
          {children}
        </div>
      )
    },
    Surface: ({ props, children }) => {
      const { description, title } = props as SurfaceProps

      return (
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            {description ? (
              <CardDescription>{description}</CardDescription>
            ) : null}
          </CardHeader>
          {children ? <CardContent>{children}</CardContent> : null}
        </Card>
      )
    },
    Text: ({ props }) => {
      const { value, variant = "body" } = props as TextProps

      return (
        <p
          className={cn(
            variant === "body" && "text-sm",
            variant === "muted" && "text-sm text-muted-foreground",
            variant === "caption" && "text-xs text-muted-foreground"
          )}
        >
          {value}
        </p>
      )
    },
    Notice: ({ props }) => {
      const noticeProps = props as NoticeRendererProps

      return <NoticeRenderer {...noticeProps} />
    },
  },
  actions: {},
})

type SitesTableProps = {
  variant?: "card" | "embedded"
}

type SiteTrendProps = {
  includeSitesTable?: boolean
}

type StackProps = {
  columns?: "1" | "2"
  gap?: "sm" | "md" | "lg"
}

type SurfaceProps = {
  title: string
  description?: string
}

type TextProps = {
  value: string
  variant?: "body" | "muted" | "caption"
}

function DashboardOverviewRenderer() {
  const sitesQuery = useSitesQuery()
  const sites = sitesQuery.data ?? []
  const metrics = buildDashboardMetrics(sites)

  return (
    <div className="grid gap-4">
      <DashboardSummaryCards
        isLoading={sitesQuery.isPending}
        metrics={metrics}
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <SiteEmissionsTrendCard
          isLoadingSites={sitesQuery.isPending}
          sites={sites}
        >
          <SitesOverviewTable
            isLoading={sitesQuery.isPending}
            sites={sites}
            variant="embedded"
          />
        </SiteEmissionsTrendCard>
        <div className="grid gap-4">
          <SiteMetricsPanel sites={sites} />
          <CreateSiteForm />
          <ManualIngestionForm sites={sites} />
        </div>
      </div>
    </div>
  )
}

function SummaryCardsRenderer() {
  const sitesQuery = useSitesQuery()
  const metrics = buildDashboardMetrics(sitesQuery.data ?? [])

  return (
    <DashboardSummaryCards isLoading={sitesQuery.isPending} metrics={metrics} />
  )
}

function SitesTableRenderer({ variant }: { variant: "card" | "embedded" }) {
  const sitesQuery = useSitesQuery()

  return (
    <SitesOverviewTable
      isLoading={sitesQuery.isPending}
      sites={sitesQuery.data ?? []}
      variant={variant}
    />
  )
}

function SiteTrendRenderer({
  includeSitesTable,
}: {
  includeSitesTable: boolean
}) {
  const sitesQuery = useSitesQuery()
  const sites = sitesQuery.data ?? []

  return (
    <SiteEmissionsTrendCard
      isLoadingSites={sitesQuery.isPending}
      sites={sites}
    >
      {includeSitesTable ? (
        <SitesOverviewTable
          isLoading={sitesQuery.isPending}
          sites={sites}
          variant="embedded"
        />
      ) : null}
    </SiteEmissionsTrendCard>
  )
}

function SiteMetricsRenderer() {
  const sitesQuery = useSitesQuery()

  return <SiteMetricsPanel sites={sitesQuery.data ?? []} />
}

function ManualIngestionRenderer() {
  const sitesQuery = useSitesQuery()

  if (sitesQuery.isPending) {
    return <Skeleton className="h-[420px] w-full" />
  }

  return <ManualIngestionForm sites={sitesQuery.data ?? []} />
}

type NoticeRendererProps = {
  title: string
  message: string
  tone: "neutral" | "info" | "success" | "warning" | "danger"
}

function NoticeRenderer({ message, title, tone }: NoticeRendererProps) {
  return (
    <div
      className={cn(
        "rounded-md border p-3 text-sm",
        tone === "danger" && "border-destructive/40 bg-destructive/5",
        tone === "warning" && "border-amber-500/40 bg-amber-500/10",
        tone === "success" && "border-emerald-500/40 bg-emerald-500/10",
        (tone === "neutral" || tone === "info") && "bg-muted/40"
      )}
    >
      <div className="flex gap-2">
        {tone === "danger" ? (
          <AlertCircleIcon className="mt-0.5 size-4 text-destructive" />
        ) : (
          <InfoIcon className="mt-0.5 size-4 text-muted-foreground" />
        )}
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  )
}

function UnknownRendererComponent() {
  return (
    <NoticeRenderer
      title="Unsupported view"
      message="The assistant requested a renderer component that is not available in this dashboard."
      tone="warning"
    />
  )
}
