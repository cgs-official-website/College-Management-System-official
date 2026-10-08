import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createSlotSchema = z
  .object({
    date: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD'),
    startTime: z.string().regex(timeRegex, 'Start time must be HH:MM'),
    endTime: z.string().regex(timeRegex, 'End time must be HH:MM'),
  })
  .refine((d) => d.endTime > d.startTime, {
    message: 'End time must be after start time',
  });

export const assignMeetingSchema = z.object({
  slotId: z.string().uuid('Invalid slot ID'),
  studentId: z.string().uuid('Invalid student ID'),
  mode: z.enum(['online', 'offline']).default('online'),
  venue: z.string().trim().max(200).optional(),
  agenda: z.string().trim().max(1000).optional(),
});

export const updateMeetingSchema = z.object({
  status: z.enum(['completed', 'cancelled']).optional(),
  teacherNotes: z.string().trim().max(2000).optional(),
  agenda: z.string().trim().max(1000).optional(),
});