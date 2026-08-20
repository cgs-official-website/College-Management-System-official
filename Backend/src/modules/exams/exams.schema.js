import { z } from 'zod';

export const enterMarksSchema = z.object({
  studentId: z.string().uuid(),
  examId: z.string().uuid(),
  obtainedMarks: z.number().min(0),
  remarks: z.string().optional()
});
