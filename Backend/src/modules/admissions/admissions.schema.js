import { z } from 'zod';

export const submitApplicationSchema = z.object({
  applicantName: z.string().min(2),
  departmentId: z.string().uuid(),
  marksheetDetails: z.record(z.number()),
  createdFromLeadId: z.string().uuid().optional()
});

export const allotSeatSchema = z.object({
  admissionId: z.string().uuid()
});
