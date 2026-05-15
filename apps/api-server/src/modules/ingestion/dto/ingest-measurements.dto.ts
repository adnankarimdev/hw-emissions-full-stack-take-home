import { z } from 'zod';

const isoDateTime = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Expected an ISO-8601 date-time string.',
  });

export const ingestMeasurementsSchema = z.object({
  site_id: z.uuid(),
  idempotency_key: z.string().trim().min(8).max(160),
  readings: z
    .array(
      z.object({
        source_id: z.string().trim().min(1).max(160),
        measured_at: isoDateTime,
        methane_kg: z.coerce.number().positive(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .min(1)
    .max(100),
});

export type IngestMeasurementsRequest = z.infer<
  typeof ingestMeasurementsSchema
>;
