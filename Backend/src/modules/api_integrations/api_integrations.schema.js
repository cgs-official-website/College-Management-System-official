import { z } from 'zod';

export const integrationSchema = z.object({
  provider: z.string().min(1, 'Provider is required'),
  apiKey: z.string().optional().nullable(),
  apiSecret: z.string().optional().nullable(),
  webhookUrl: z.string().url().optional().nullable().or(z.literal('')),
  isActive: z.boolean().default(true),
});
