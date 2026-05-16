import { tool } from "ai"
import { z } from "zod"

import { ingestMeasurements } from "@/features/ingestion/api/ingestion-api"
import {
  createSite,
  getSiteEmissionsTrend,
  getSiteMetrics,
  listSites,
} from "@/features/sites/api/sites-api"
import { chatRenderSpecSchema } from "@/features/chat/renderer/spec"

const metadataSchema = z.record(z.string(), z.unknown())

const readingInputSchema = z.object({
  sourceId: z
    .string()
    .trim()
    .min(1)
    .describe("Stable source or sensor identifier."),
  measuredAt: z
    .string()
    .trim()
    .min(1)
    .describe("Measurement timestamp. ISO 8601 is preferred."),
  methaneKg: z.number().positive().describe("Measured methane mass in kilograms."),
  metadata: metadataSchema.optional(),
})

export const operationsChatTools = {
  listSites: tool({
    description:
      "List all monitored industrial sites with totals, limits, metadata-derived operator/location, latest reading time, and compliance status.",
    inputSchema: z.object({}),
    execute: async () => {
      const sites = await listSites()

      return {
        count: sites.length,
        sites,
        generatedAt: new Date().toISOString(),
      }
    },
  }),
  getSiteMetrics: tool({
    description:
      "Get the current compliance metrics for one monitored site. Use only with a real site id from listSites or user context.",
    inputSchema: z.object({
      siteId: z.string().trim().min(1),
    }),
    execute: async ({ siteId }) => {
      return getSiteMetrics(siteId)
    },
  }),
  getSiteEmissionsTrend: tool({
    description:
      "Get the real persisted per-site methane emissions trend for one site.",
    inputSchema: z.object({
      siteId: z.string().trim().min(1),
      days: z.number().int().min(1).max(90).default(7),
    }),
    execute: async ({ days, siteId }) => {
      return getSiteEmissionsTrend({ days, siteId })
    },
  }),
  createSite: tool({
    description:
      "Create a monitored industrial site. Only call after the admin provides name, emissionLimitKg, operator, and location and clearly intends to create the site.",
    inputSchema: z.object({
      name: z.string().trim().min(2),
      emissionLimitKg: z.number().positive(),
      operator: z.string().trim().min(2),
      location: z.string().trim().min(2),
    }),
    execute: async (input) => {
      return createSite(input)
    },
  }),
  ingestMeasurements: tool({
    description:
      "Submit a methane readings batch for a monitored site. Requires an idempotency key so low-connectivity retries do not double-count emissions.",
    inputSchema: z.object({
      siteId: z.string().trim().min(1),
      idempotencyKey: z.string().trim().min(8),
      readings: z.array(readingInputSchema).min(1).max(100),
    }),
    execute: async ({ idempotencyKey, readings, siteId }) => {
      return ingestMeasurements({
        siteId,
        idempotencyKey,
        readings: readings.map((reading) => ({
          sourceId: reading.sourceId,
          measuredAt: toIsoDateTime(reading.measuredAt),
          methaneKg: reading.methaneKg,
          metadata: reading.metadata,
        })),
      })
    },
  }),
  renderDashboardUi: tool({
    description:
      "Render constrained dashboard UI inside the chat using existing dashboard widgets and forms. Use this whenever a user asks to view metrics, tables, trends, dashboard state, create-site UI, or ingestion UI.",
    inputSchema: z.object({
      title: z.string().trim().min(1).optional(),
      reason: z.string().trim().min(1).optional(),
      spec: chatRenderSpecSchema,
    }),
    execute: async ({ reason, spec, title }) => {
      return {
        title: title ?? "Rendered dashboard view",
        reason: reason ?? null,
        spec,
        renderedAt: new Date().toISOString(),
      }
    },
  }),
}

function toIsoDateTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid measurement timestamp: ${value}`)
  }

  return date.toISOString()
}
