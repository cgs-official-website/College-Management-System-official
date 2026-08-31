import { z } from 'zod';

export const createStaffSchema = z.object({
  name: z.string().optional().default(''),
  email: z.string({ required_error: 'Email is required' }).trim().min(1, 'Email is required').email('Invalid email address'),
  department: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  designation: z.string().min(1, 'Designation is required'),
  joiningDate: z.string().or(z.date()).optional(),
  salaryGrade: z.string().optional(),
  role: z.string().optional().default('teacher'),
  customRoleId: z.string().uuid().nullable().optional(),
  status: z.string().optional().default('active'),
  phone: z.string().regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits').optional().or(z.literal('')).nullable(),
});

export const updateStaffSchema = createStaffSchema.partial();
