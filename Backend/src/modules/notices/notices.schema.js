import { z } from 'zod';

export const createNoticeSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  content: z.string().optional().default(''),
  priority: z.enum(['low', 'normal', 'high']).optional().default('normal'),
  targetAudience: z.enum(['all', 'students', 'staff']).optional().default('all')
});

export const updateNoticeSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty').optional(),
  content: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  targetAudience: z.enum(['all', 'students', 'staff']).optional()
});
