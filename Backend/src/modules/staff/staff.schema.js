import { z } from 'zod';

export const createStaffSchema = z.object({
  name: z.string().optional().default(''),
  email: z.string().email('Invalid email address'),
  department: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  designation: z.string().min(1, 'Designation is required'),
  joiningDate: z.string().or(z.date()).optional(),
  salaryGrade: z.string().optional(),
  role: z.string().optional().default('teacher'),
  customRoleId: z.string().uuid().nullable().optional(),
  status: z.string().optional().default('active'),
  phone: z.string().optional(),
});

export const updateStaffSchema = createStaffSchema.partial();
