import { z } from 'zod';

export const createPlacementSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  role: z.string().optional().default('Graduate Engineer Trainee'),
  ctc: z.string().optional().default('6.0 LPA'),
  driveDate: z.string().optional(),
  status: z.string().optional().default('upcoming'),
  studentsPlaced: z.number().or(z.string().transform(v => Number(v) || 0)).optional().default(0),
  eligibilityCriteria: z.string().optional(),
  eligibility: z.any().optional(),
});

export const updatePlacementSchema = createPlacementSchema.partial();
