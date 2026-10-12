import { z } from 'zod';

export const attendanceReportQuerySchema = z.object({
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid ISO date string' }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid ISO date string' }),
  departmentId: z.string().optional(),
  classId: z.string().optional(),
  groupBy: z.enum(['day', 'class', 'department']).default('class'),
});
