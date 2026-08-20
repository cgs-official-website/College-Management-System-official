import { z } from 'zod';

export const markAttendanceSchema = z.object({
  studentId: z.string().uuid(),
  courseId: z.string().uuid(),
  date: z.string(), // ISO date string
  status: z.enum(['present', 'absent', 'late']),
  classEndTime: z.string().optional() // ISO string, passed by frontend to check late marking
});
