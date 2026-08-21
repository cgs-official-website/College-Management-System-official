import { z } from 'zod';

export const createHostelBlockSchema = z.object({
  name: z.string().min(1, 'Hostel block name is required'),
  type: z.enum(['Boys', 'Girls', 'Co-Ed', 'Staff']).optional().default('Boys'),
  totalRooms: z.number().or(z.string().transform(v => Number(v) || 100)).optional().default(100),
  occupied: z.number().or(z.string().transform(v => Number(v) || 0)).optional().default(45),
  wardenName: z.string().optional().default('Prof. Chief Warden'),
  wardenPhone: z.string().optional().default('+91 98765 43210'),
  status: z.enum(['Active', 'Full', 'Renovation']).optional().default('Active'),
});

export const updateHostelBlockSchema = createHostelBlockSchema.partial();
