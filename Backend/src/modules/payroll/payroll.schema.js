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

export const createPayslipSchema = z.object({
  staffId: z.string().uuid(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  basicPay: z.coerce.number().min(0),
  hra: z.coerce.number().min(0).default(0),
  da: z.coerce.number().min(0).default(0),
  specialAllowance: z.coerce.number().min(0).default(0),
  pf: z.coerce.number().min(0).default(0),
  esi: z.coerce.number().min(0).default(0),
  pt: z.coerce.number().min(0).default(0),
  tds: z.coerce.number().min(0).default(0),
  otherDeductions: z.coerce.number().min(0).default(0),
});

export const bulkImportPayrollSchema = z.array(createPayslipSchema);
