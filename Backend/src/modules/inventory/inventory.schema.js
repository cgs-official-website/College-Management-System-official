import { z } from 'zod';

export const inventoryItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  sku: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  quantity: z.number().int().min(0).default(0),
  unitPrice: z.number().min(0).default(0.0),
});
