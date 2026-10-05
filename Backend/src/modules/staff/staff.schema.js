import { z } from 'zod';

export const createStaffSchema = z.object({
  name: z.string().optional().default(''),
  // Email is optional at creation time.
  // If provided, it is used to pre-fill the teacher's user account.
  // If omitted, the teacher will enter their own email during registration.
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address.')
    .optional()
    .or(z.literal('')),
  department: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  designation: z.string().min(1, 'Designation is required'),
  joiningDate: z.string().or(z.date()).optional(),
  salaryGrade: z.string().optional(),
  role: z.string().optional(),
  staffType: z.enum(['teaching', 'non-teaching']).optional().default('teaching'),
  customRoleId: z.string().uuid().nullable().optional(),
  status: z.string().optional().default('active'),
  phone: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
    z.string()
      .regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits.')
      .nullable()
      .optional()
  ),
  // teacherId is MANDATORY for creation
  teacherId: z.string({ required_error: 'Teacher ID is required.' })
    .trim()
    .min(1, 'Teacher ID is required.'),
});


// For updates: teacherId is still required if provided; cannot be set to empty
export const updateStaffSchema = createStaffSchema
  .omit({ teacherId: true })
  .extend({
    teacherId: z.string()
      .trim()
      .min(1, 'Teacher ID cannot be empty.')
      .optional(),
  })
  .partial()
  .extend({
    // Keep email optional during edits; validate it when supplied.
    email: z
      .string()
      .trim()
      .email('Please enter a valid email address.')
      .optional()
      .or(z.literal('')),
  });
