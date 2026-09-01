import { z } from 'zod';

export const createStaffSchema = z.object({
  name: z.string().nullish(),
  email: z.string().email('Invalid email address'),
  department: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  designation: z.string().min(1, 'Designation is required'),
  joiningDate: z.string().or(z.date()).optional(),
  salaryGrade: z.string().optional(),
  role: z.string().optional(),
  customRoleId: z.string().uuid().nullable().optional(),
  status: z.string().optional(),
  phone: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
    z.string()
      .regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits.')
      .nullable()
      .optional()
  ),
});

export const updateStaffSchema = createStaffSchema.partial();
