import { z } from "zod"

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ])
)

export const chatRendererComponentTypeSchema = z.enum([
  "DashboardOverview",
  "SummaryCards",
  "SitesTable",
  "SiteTrend",
  "SiteMetrics",
  "CreateSiteForm",
  "ManualIngestionForm",
  "Stack",
  "Surface",
  "Text",
  "Notice",
])

const chatRenderElementSchema = z
  .object({
    type: chatRendererComponentTypeSchema,
    props: z.record(z.string(), jsonValueSchema).default({}),
    children: z.array(z.string()).optional(),
    visible: z.unknown().optional(),
  })
  .strict()

export const chatRenderSpecSchema = z
  .object({
    root: z.string().min(1),
    elements: z.record(z.string(), chatRenderElementSchema),
    state: z.record(z.string(), jsonValueSchema).optional(),
  })
  .superRefine((spec, context) => {
    const elementIds = new Set(Object.keys(spec.elements))

    if (!elementIds.has(spec.root)) {
      context.addIssue({
        code: "custom",
        message: "Spec root must reference an element in elements.",
        path: ["root"],
      })
    }

    if (elementIds.size > 40) {
      context.addIssue({
        code: "custom",
        message: "Rendered chat specs must contain 40 elements or fewer.",
        path: ["elements"],
      })
    }

    for (const [elementId, element] of Object.entries(spec.elements)) {
      for (const childId of element.children ?? []) {
        if (!elementIds.has(childId)) {
          context.addIssue({
            code: "custom",
            message: `Element "${elementId}" references missing child "${childId}".`,
            path: ["elements", elementId, "children"],
          })
        }
      }
    }
  })

export type ChatRenderSpec = z.infer<typeof chatRenderSpecSchema>
export type ChatRendererComponentType = z.infer<
  typeof chatRendererComponentTypeSchema
>

export const chatRendererComponentNames =
  chatRendererComponentTypeSchema.options
