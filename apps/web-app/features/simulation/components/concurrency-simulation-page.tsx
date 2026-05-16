"use client"

import { useMemo, useState } from "react"
import {
  CheckCircle2Icon,
  FlaskConicalIcon,
  Loader2Icon,
  PlayIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "lucide-react"

import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ingestMeasurements } from "@/features/ingestion/api/ingestion-api"
import type { IngestionResult } from "@/features/ingestion/types"
import { createSite, getSiteMetrics } from "@/features/sites/api/sites-api"
import type { SiteMetrics, SiteSummary } from "@/features/sites/types"
import { getApiErrorMessage } from "@/lib/api/client"
import { cn } from "@/lib/utils"

type SimulationStatus = "idle" | "running" | "passed" | "failed"

type SourceSimulationResult = {
  errorMessage?: string
  idempotencyKey: string
  methaneKg: number
  result?: IngestionResult
  sourceId: string
  status: "accepted" | "failed"
}

type SimulationRun = {
  actualTotalKg: number | null
  durationMs: number
  expectedTotalKg: number
  results: SourceSimulationResult[]
  runId: string
  site: SiteSummary
  siteMetrics: SiteMetrics | null
  status: "passed" | "failed"
}

const DEFAULT_SOURCE_COUNT = 10
const DEFAULT_METHANE_KG = 10
const SIMULATION_SITE_LIMIT_KG = 1_000_000

export function ConcurrencySimulationPage() {
  const [sourceCount, setSourceCount] = useState(DEFAULT_SOURCE_COUNT)
  const [methaneKgPerSource, setMethaneKgPerSource] =
    useState(DEFAULT_METHANE_KG)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [simulationRun, setSimulationRun] = useState<SimulationRun | null>(null)
  const [status, setStatus] = useState<SimulationStatus>("idle")
  const expectedTotalKg = useMemo(
    () => sourceCount * methaneKgPerSource,
    [methaneKgPerSource, sourceCount]
  )

  async function runSimulation() {
    const boundedSourceCount = clampInteger(sourceCount, 1, 25)
    const boundedMethaneKg = clampNumber(methaneKgPerSource, 0.001, 100000)
    const runId = createSimulationRunId()
    const startedAt = performance.now()

    setSourceCount(boundedSourceCount)
    setMethaneKgPerSource(boundedMethaneKg)
    setErrorMessage(null)
    setSimulationRun(null)
    setStatus("running")

    try {
      const site = await createSite({
        name: `Concurrency Simulation ${new Date().toISOString()}`,
        emissionLimitKg: SIMULATION_SITE_LIMIT_KG,
        location: "Reviewer Sandbox",
        operator: "Simulation Harness",
      })
      const results = await Promise.all(
        Array.from({ length: boundedSourceCount }, (_, index) =>
          ingestSimulationSource({
            index,
            methaneKg: boundedMethaneKg,
            runId,
            siteId: site.id,
          })
        )
      )
      const siteMetrics = await getSiteMetrics(site.id)
      const expectedTotal = boundedSourceCount * boundedMethaneKg
      const actualTotal = siteMetrics.totalEmissionsKg
      const allSourcesAccepted = results.every(
        (result) => result.status === "accepted"
      )
      const totalsMatch = amountsEqual(actualTotal, expectedTotal)
      const nextStatus = allSourcesAccepted && totalsMatch ? "passed" : "failed"

      setSimulationRun({
        actualTotalKg: actualTotal,
        durationMs: Math.round(performance.now() - startedAt),
        expectedTotalKg: expectedTotal,
        results,
        runId,
        site,
        siteMetrics,
        status: nextStatus,
      })
      setStatus(nextStatus)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
      setStatus("failed")
    }
  }

  return (
    <DashboardShell title="Concurrency Simulation">
      <main className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
          <SimulationHeader status={status} />
          <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
            <SimulationControls
              expectedTotalKg={expectedTotalKg}
              isRunning={status === "running"}
              methaneKgPerSource={methaneKgPerSource}
              onMethaneKgPerSourceChange={setMethaneKgPerSource}
              onRun={() => void runSimulation()}
              onSourceCountChange={setSourceCount}
              sourceCount={sourceCount}
            />
            <SimulationResults
              errorMessage={errorMessage}
              isRunning={status === "running"}
              run={simulationRun}
            />
          </div>
        </div>
      </main>
    </DashboardShell>
  )
}

type SimulationHeaderProps = {
  status: SimulationStatus
}

function SimulationHeader({ status }: SimulationHeaderProps) {
  return (
    <Card>
      <CardHeader className="gap-3 md:grid-cols-[1fr_auto]">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-background">
            <ShieldCheckIcon className="size-5 text-muted-foreground" />
          </div>
          <div className="grid gap-1">
            <CardTitle>Same-site concurrent ingestion test</CardTitle>
            <CardDescription>
              Creates an isolated site, sends concurrent ingestion requests to
              the same site id, then compares the expected total against the
              persisted site metrics.
            </CardDescription>
          </div>
        </div>
        <CardAction>
          <SimulationStatusBadge status={status} />
        </CardAction>
      </CardHeader>
    </Card>
  )
}

type SimulationControlsProps = {
  expectedTotalKg: number
  isRunning: boolean
  methaneKgPerSource: number
  onMethaneKgPerSourceChange: (value: number) => void
  onRun: () => void
  onSourceCountChange: (value: number) => void
  sourceCount: number
}

function SimulationControls({
  expectedTotalKg,
  isRunning,
  methaneKgPerSource,
  onMethaneKgPerSourceChange,
  onRun,
  onSourceCountChange,
  sourceCount,
}: SimulationControlsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Simulation Setup</CardTitle>
        <CardDescription>
          Default configuration mirrors the concurrency requirement: 10 sources
          writing to one site at the same time.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="source-count">Concurrent sources</Label>
          <Input
            id="source-count"
            max={25}
            min={1}
            onChange={(event) =>
              onSourceCountChange(Number(event.currentTarget.value))
            }
            type="number"
            value={sourceCount}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="methane-kg">Methane kg per source</Label>
          <Input
            id="methane-kg"
            min={0.001}
            onChange={(event) =>
              onMethaneKgPerSourceChange(Number(event.currentTarget.value))
            }
            step="0.001"
            type="number"
            value={methaneKgPerSource}
          />
        </div>
        <div className="rounded-md border bg-muted/30 p-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Expected site total
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {formatKg(expectedTotalKg)}
          </p>
        </div>
        <Button disabled={isRunning} onClick={onRun} type="button">
          {isRunning ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <PlayIcon />
          )}
          {isRunning ? "Running Simulation" : "Run Simulation"}
        </Button>
      </CardContent>
    </Card>
  )
}

type SimulationResultsProps = {
  errorMessage: string | null
  isRunning: boolean
  run: SimulationRun | null
}

function SimulationResults({
  errorMessage,
  isRunning,
  run,
}: SimulationResultsProps) {
  if (isRunning) {
    return (
      <Card>
        <CardContent className="flex min-h-80 items-center justify-center">
          <div className="grid justify-items-center gap-3 text-center">
            <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
            <div>
              <p className="font-medium">Running concurrent ingestion</p>
              <p className="text-sm text-muted-foreground">
                Requests are in flight against the same site id.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (errorMessage) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader>
          <CardTitle>Simulation Failed To Start</CardTitle>
          <CardDescription>{errorMessage}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!run) {
    return (
      <Card>
        <CardContent className="flex min-h-80 items-center justify-center">
          <div className="grid max-w-md justify-items-center gap-3 text-center">
            <FlaskConicalIcon className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium">No simulation run yet</p>
              <p className="text-sm leading-6 text-muted-foreground">
                Run the test to create a sandbox site and verify pessimistic
                locking plus atomic increments against real persisted data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <SimulationMetric
          label="Expected"
          value={formatKg(run.expectedTotalKg)}
        />
        <SimulationMetric
          label="Persisted"
          value={
            run.actualTotalKg === null ? "Unavailable" : formatKg(run.actualTotalKg)
          }
        />
        <SimulationMetric label="Duration" value={`${run.durationMs} ms`} />
      </div>
      <Card
        className={cn(
          run.status === "passed"
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-destructive/40 bg-destructive/5"
        )}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {run.status === "passed" ? (
              <CheckCircle2Icon className="mt-0.5 size-5 text-emerald-600" />
            ) : (
              <XCircleIcon className="mt-0.5 size-5 text-destructive" />
            )}
            <div>
              <CardTitle>
                {run.status === "passed"
                  ? "Concurrency protection verified"
                  : "Concurrency check failed"}
              </CardTitle>
              <CardDescription className="mt-1">
                Site {run.site.name} persisted{" "}
                {run.actualTotalKg === null ? "no final total" : formatKg(run.actualTotalKg)}
                . Expected {formatKg(run.expectedTotalKg)} from{" "}
                {run.results.length} concurrent sources.
              </CardDescription>
            </div>
          </div>
          <SimulationStatusBadge status={run.status} />
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Source Results</CardTitle>
          <CardDescription>
            Each row represents one simultaneous ingestion request with a unique
            idempotency key.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Idempotency Key</TableHead>
                <TableHead className="text-right">Methane</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total After</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {run.results.map((result) => (
                <TableRow key={result.idempotencyKey}>
                  <TableCell>{result.sourceId}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {result.idempotencyKey}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatKg(result.methaneKg)}
                  </TableCell>
                  <TableCell>
                    {result.status === "accepted" ? (
                      <Badge variant="secondary">Accepted</Badge>
                    ) : (
                      <Badge variant="destructive">
                        {result.errorMessage ?? "Failed"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.result
                      ? formatKg(result.result.totalEmissionsToDate)
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

type SimulationMetricProps = {
  label: string
  value: string
}

function SimulationMetric({ label, value }: SimulationMetricProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

function SimulationStatusBadge({ status }: { status: SimulationStatus }) {
  if (status === "passed") {
    return <Badge variant="secondary">Passed</Badge>
  }

  if (status === "failed") {
    return <Badge variant="destructive">Failed</Badge>
  }

  if (status === "running") {
    return <Badge variant="outline">Running</Badge>
  }

  return <Badge variant="outline">Ready</Badge>
}

async function ingestSimulationSource({
  index,
  methaneKg,
  runId,
  siteId,
}: {
  index: number
  methaneKg: number
  runId: string
  siteId: string
}): Promise<SourceSimulationResult> {
  const sourceNumber = index + 1
  const sourceId = `sim-source-${sourceNumber.toString().padStart(2, "0")}`
  const idempotencyKey = `simulation-${runId}-${sourceNumber}`

  try {
    const result = await ingestMeasurements({
      siteId,
      idempotencyKey,
      readings: [
        {
          measuredAt: new Date(Date.now() + index).toISOString(),
          methaneKg,
          sourceId,
          metadata: {
            concurrency_index: sourceNumber,
            simulation_run_id: runId,
          },
        },
      ],
    })

    return {
      idempotencyKey,
      methaneKg,
      result,
      sourceId,
      status: "accepted",
    }
  } catch (error) {
    return {
      errorMessage: getApiErrorMessage(error),
      idempotencyKey,
      methaneKg,
      sourceId,
      status: "failed",
    }
  }
}

function amountsEqual(left: number, right: number) {
  return Math.abs(left - right) < 0.000001
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min
  }

  return Math.min(Math.max(Math.trunc(value), min), max)
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min
  }

  return Math.min(Math.max(value, min), max)
}

function createSimulationRunId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID()
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function formatKg(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 3,
  }).format(value)} kg`
}
