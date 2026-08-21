import { z } from 'zod';

export const createTimetableSlotSchema = z.object({
  subject: z.string().min(1, 'Subject name is required'),
  courseName: z.string().optional().default('General Studies'),
  courseId: z.string().optional(),
  teacherName: z.string().optional().default('TBA'),
  teacherId: z.string().optional(),
  dayOfWeek: z.string().or(z.number()).default('Monday'),
  startTime: z.string().default('09:00'),
  endTime: z.string().default('10:00'),
  room: z.string().min(1, 'Room / Lab number is required'),
  status: z.enum(['pending', 'approved', 'active']).optional().default('approved'),
});

export const updateTimetableSlotSchema = createTimetableSlotSchema.partial();
