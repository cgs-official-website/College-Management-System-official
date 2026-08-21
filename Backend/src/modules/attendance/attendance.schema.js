import { z } from 'zod';

export const markAttendanceSchema = z.object({
  studentId: z.string().uuid(),
  courseId: z.string().uuid().optional(),
  date: z.string(),
  status: z.enum(['present', 'absent', 'late']),
  classEndTime: z.string().optional()
});

export const batchMarkAttendanceSchema = z.object({
  courseId: z.string().uuid().optional(),
  date: z.string(),
  records: z.array(z.object({
    studentId: z.string().uuid(),
    status: z.enum(['present', 'absent', 'late'])
  }))
});
