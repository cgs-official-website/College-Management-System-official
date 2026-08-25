import { z } from 'zod';

export const generatePayrollSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100)
});

export const updatePayrollStatusSchema = z.object({
  status: z.enum(['Paid', 'Cancelled']),
  paymentMethod: z.string().optional(),
  remarks: z.string().optional()
});
