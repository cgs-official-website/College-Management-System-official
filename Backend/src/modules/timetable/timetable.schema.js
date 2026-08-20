import { z } from 'zod';

export const scheduleSlotSchema = z.object({
  departmentId: z.string().uuid(),
  sectionId: z.string().uuid(),
  courseId: z.string().uuid(),
  teacherId: z.string().uuid(),
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string(), // e.g. 09:00
  endTime: z.string(),   // e.g. 10:00
  room: z.string()
});
