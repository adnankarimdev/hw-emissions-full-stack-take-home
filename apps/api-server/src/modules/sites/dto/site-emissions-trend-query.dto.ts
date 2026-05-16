import { z } from 'zod';

export const siteEmissionsTrendQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
});

export type SiteEmissionsTrendQuery = z.infer<
  typeof siteEmissionsTrendQuerySchema
>;
