import { z } from 'zod';

export const createSiteSchema = z.object({
  name: z.string().trim().min(1).max(160),
  emission_limit: z.coerce.number().positive(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type CreateSiteRequest = z.infer<typeof createSiteSchema>;
