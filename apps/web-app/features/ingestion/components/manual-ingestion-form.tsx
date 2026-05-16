"use client"

import { FormEvent, useMemo, useState } from "react"
import {
  CheckCircle2Icon,
  Loader2Icon,
  RadioTowerIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SendIcon,
} from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useIngestMeasurementsMutation } from "@/features/ingestion/api/ingestion-mutations"
import type {
  IngestionBatchDraft,
  IngestionResult,
} from "@/features/ingestion/types"
import type { SiteSummary } from "@/features/sites/types"
import { getApiErrorMessage } from "@/lib/api/client"
import { formatKilograms } from "@/lib/format/emissions"

const manualIngestionFormSchema = z.object({
  siteId: z.uuid("Select a monitored site."),
  idempotencyKey: z.string().trim().min(8, "Use at least 8 characters."),
  sourceId: z.string().trim().min(1, "Enter a source ID."),
  methaneKg: z.coerce
    .number<number>()
    .positive("Methane reading must be greater than zero."),
  measuredAt: z.string().min(1, "Enter the measurement time."),
})

type ManualIngestionFormState = {
  siteId: string
  idempotencyKey: string
  sourceId: string
  methaneKg: string
  measuredAt: string
}

type ManualIngestionFormField = keyof ManualIngestionFormState
type ManualIngestionFormErrors = Partial<
  Record<ManualIngestionFormField, string>
>

type ManualIngestionFormProps = {
  sites: SiteSummary[]
}

const initialFormState: ManualIngestionFormState = {
  siteId: "",
  idempotencyKey: "",
  sourceId: "sensor-north-7",
  methaneKg: "126",
  measuredAt: "",
}

export function ManualIngestionForm({ sites }: ManualIngestionFormProps) {
  const [formState, setFormState] =
    useState<ManualIngestionFormState>(initialFormState)
  const [errors, setErrors] = useState<ManualIngestionFormErrors>({})
  const [lastSubmittedBatch, setLastSubmittedBatch] =
    useState<IngestionBatchDraft | null>(null)
  const [lastResult, setLastResult] = useState<IngestionResult | null>(null)
  const ingestMutation = useIngestMeasurementsMutation()
  const selectedSiteId = formState.siteId || sites[0]?.id || ""

  const selectedSite = useMemo(
    () => sites.find((site) => site.id === selectedSiteId) ?? null,
    [selectedSiteId, sites]
  )

  function updateField(field: ManualIngestionFormField, value: string) {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }))
    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }))
  }

  function resetForNewBatch() {
    setFormState((current) => ({
      ...current,
      idempotencyKey: createIdempotencyKey(),
      measuredAt: toDateTimeLocalValue(new Date()),
    }))
    setLastResult(null)
    setLastSubmittedBatch(null)
    setErrors({})
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formWithDefaults = {
      ...formState,
      siteId: selectedSiteId,
      idempotencyKey: formState.idempotencyKey || createIdempotencyKey(),
      measuredAt: formState.measuredAt || toDateTimeLocalValue(new Date()),
    }
    const batch = buildBatchFromForm(formWithDefaults)

    if (!batch.ok) {
      setErrors(batch.errors)
      return
    }

    setFormState(formWithDefaults)
    submitBatch(batch.value)
  }

  function submitBatch(batch: IngestionBatchDraft) {
    setErrors({})
    setLastSubmittedBatch(batch)
    ingestMutation.mutate(batch, {
      onSuccess: (result) => {
        setLastResult(result)
        if (!result.duplicate) {
          setFormState((current) => ({
            ...current,
            idempotencyKey: createIdempotencyKey(),
            measuredAt: toDateTimeLocalValue(new Date()),
          }))
        }
        toast.success(
          result.duplicate
            ? "Duplicate batch detected. Totals were not changed."
            : "Measurement batch ingested."
        )
      },
      onError: (error) => {
        toast.error(getApiErrorMessage(error))
      },
    })
  }

  return (
    <Card id="ingestion">
      <CardHeader>
        <div className="flex items-center gap-2">
          <RadioTowerIcon className="size-4 text-muted-foreground" />
          <CardTitle>Manual Ingestion</CardTitle>
        </div>
        <CardDescription>Submit a methane reading batch for a monitored site</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="grid gap-4">
          <FormField error={errors.siteId} fieldId="ingest-site" label="Site">
            <Select
              value={selectedSiteId}
              onValueChange={(value) => updateField("siteId", value)}
              disabled={sites.length === 0}
            >
              <SelectTrigger
                id="ingest-site"
                className="w-full"
                aria-invalid={Boolean(errors.siteId)}
              >
                <SelectValue placeholder="Create a site first" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            error={errors.idempotencyKey}
            fieldId="idempotency-key"
            label="Idempotency Key"
          >
            <div className="flex gap-2">
              <Input
                id="idempotency-key"
                value={formState.idempotencyKey}
                onChange={(event) =>
                  updateField("idempotencyKey", event.target.value)
                }
                aria-invalid={Boolean(errors.idempotencyKey)}
                placeholder="Generated on submit"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={resetForNewBatch}
              >
                <RefreshCwIcon />
                <span className="sr-only">Generate new batch key</span>
              </Button>
            </div>
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              error={errors.sourceId}
              fieldId="source-id"
              label="Source ID"
            >
              <Input
                id="source-id"
                value={formState.sourceId}
                onChange={(event) =>
                  updateField("sourceId", event.target.value)
                }
                aria-invalid={Boolean(errors.sourceId)}
              />
            </FormField>
            <FormField
              error={errors.methaneKg}
              fieldId="methane-kg"
              label="Methane kg"
            >
              <Input
                id="methane-kg"
                type="number"
                min="0"
                step="0.001"
                value={formState.methaneKg}
                onChange={(event) =>
                  updateField("methaneKg", event.target.value)
                }
                aria-invalid={Boolean(errors.methaneKg)}
              />
            </FormField>
          </div>
          <FormField
            error={errors.measuredAt}
            fieldId="measured-at"
            label="Measured At"
          >
            <Input
              id="measured-at"
              type="datetime-local"
              value={formState.measuredAt}
              onChange={(event) => updateField("measuredAt", event.target.value)}
              aria-invalid={Boolean(errors.measuredAt)}
            />
          </FormField>
          {selectedSite ? (
            <p className="text-xs text-muted-foreground">
              Current total for {selectedSite.name}:{" "}
              {formatKilograms(selectedSite.totalEmissionsKg)}
            </p>
          ) : null}
          {lastResult ? <IngestionResultSummary result={lastResult} /> : null}
          {ingestMutation.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {getApiErrorMessage(ingestMutation.error)}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="grid gap-2 pt-4 sm:grid-cols-2">
          <Button
            type="submit"
            disabled={sites.length === 0 || ingestMutation.isPending}
          >
            {ingestMutation.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <SendIcon />
            )}
            Submit Batch
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!lastSubmittedBatch || ingestMutation.isPending}
            onClick={() => {
              if (lastSubmittedBatch) {
                submitBatch(lastSubmittedBatch)
              }
            }}
          >
            <RotateCcwIcon />
            Retry Same Batch
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

type FormFieldProps = {
  children: React.ReactNode
  error?: string
  fieldId: string
  label: string
}

function FormField({ children, error, fieldId, label }: FormFieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={fieldId}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

type IngestionResultSummaryProps = {
  result: IngestionResult
}

function IngestionResultSummary({ result }: IngestionResultSummaryProps) {
  return (
    <div className="rounded-md border bg-muted/40 p-3 text-sm">
      <div className="flex items-center gap-2 font-medium">
        <CheckCircle2Icon className="size-4 text-emerald-600" />
        {result.duplicate ? "Duplicate safely ignored" : "Batch accepted"}
      </div>
      <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
        <p>Readings accepted: {result.acceptedCount}</p>
        <p>Total emissions: {formatKilograms(result.totalEmissionsToDate)}</p>
        <p>Compliance: {result.complianceStatus}</p>
      </div>
    </div>
  )
}

function buildBatchFromForm(
  formState: ManualIngestionFormState
):
  | { ok: true; value: IngestionBatchDraft }
  | { ok: false; errors: ManualIngestionFormErrors } {
  const result = manualIngestionFormSchema.safeParse(formState)

  if (!result.success) {
    return {
      ok: false,
      errors: toFormErrors(result.error),
    }
  }

  const measuredAt = new Date(result.data.measuredAt)

  if (Number.isNaN(measuredAt.getTime())) {
    return {
      ok: false,
      errors: {
        measuredAt: "Enter a valid measurement time.",
      },
    }
  }

  return {
    ok: true,
    value: {
      siteId: result.data.siteId,
      idempotencyKey: result.data.idempotencyKey,
      readings: [
        {
          sourceId: result.data.sourceId,
          measuredAt: measuredAt.toISOString(),
          methaneKg: result.data.methaneKg,
          metadata: {
            submitted_by: "manual-dashboard",
          },
        },
      ],
    },
  }
}

function toFormErrors(error: z.ZodError): ManualIngestionFormErrors {
  const errors: ManualIngestionFormErrors = {}

  for (const issue of error.issues) {
    const field = issue.path[0]

    if (isManualIngestionFormField(field) && !errors[field]) {
      errors[field] = issue.message
    }
  }

  return errors
}

function isManualIngestionFormField(
  value: unknown
): value is ManualIngestionFormField {
  return (
    value === "siteId" ||
    value === "idempotencyKey" ||
    value === "sourceId" ||
    value === "methaneKg" ||
    value === "measuredAt"
  )
}

function createIdempotencyKey() {
  return `manual-${globalThis.crypto.randomUUID()}`
}

function toDateTimeLocalValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000
  const localDate = new Date(date.getTime() - offsetMs)

  return localDate.toISOString().slice(0, 16)
}
