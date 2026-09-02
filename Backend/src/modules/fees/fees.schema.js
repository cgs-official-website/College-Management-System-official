import { z } from 'zod';

export const createFeeSchema = z
  .object({
    studentId: z.string().uuid({ message: 'Valid student ID is required' }),
    amount: z
      .union([z.number(), z.string()])
      .transform((val) => Number(val))
      .refine((val) => !isNaN(val) && val > 0, {
        message: 'Amount must be a positive number'
      })
      .optional(),
    amountDue: z
      .union([z.number(), z.string()])
      .transform((val) => Number(val))
      .refine((val) => !isNaN(val) && val > 0, {
        message: 'Amount must be a positive number'
      })
      .optional(),
    feeType: z.string().optional().default('Tuition Fee'),
    dueDate: z
      .union([z.string(), z.date()])
      .transform((val) => (val instanceof Date ? val : new Date(val)))
      .refine((val) => !isNaN(val.getTime()), {
        message: 'Valid due date is required'
      }),
    status: z.enum(['pending', 'paid', 'overdue']).optional().default('pending'),
    paymentMethod: z.string().optional().nullable().default(''),
    feeStructureId: z.string().uuid().optional().nullable(),
    studentName: z.string().optional(),
    studentClass: z.string().optional()
  })
  .superRefine((data, ctx) => {
    const val = data.amount ?? data.amountDue;
    if (val === undefined || isNaN(val) || val <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Amount is required and must be a positive number',
        path: ['amount']
      });
    }
  })
  .transform((data) => ({
    ...data,
    amount: data.amount ?? data.amountDue
  }));

export const updateFeeSchema = z.object({
  status: z.enum(['pending', 'paid', 'overdue']).optional(),
  amount: z
    .union([z.number(), z.string()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, {
      message: 'Amount must be a positive number'
    })
    .optional(),
  amountDue: z.union([z.number(), z.string()]).optional(),
  amountPaid: z.union([z.number(), z.string()]).optional(),
  dueDate: z
    .union([z.string(), z.date()])
    .transform((val) => (val instanceof Date ? val : new Date(val)))
    .refine((val) => !isNaN(val.getTime()), {
      message: 'Valid due date is required'
    })
    .optional(),
  feeType: z.string().optional(),
  paymentMethod: z.string().optional().nullable()
});
