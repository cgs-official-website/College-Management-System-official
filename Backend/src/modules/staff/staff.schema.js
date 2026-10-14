import { z } from 'zod';

const staffBaseSchema = z.object({
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  name: z.string().trim().optional(),
  // Email is required and must be a valid email for setup link and mail
  email: z
    .string({ required_error: 'Please enter an email address.' })
    .trim()
    .min(1, 'Please enter an email address.')
    .email('Please enter a valid email address.'),
  department: z.string().optional(),
  departmentId: z.string().uuid('Please select a valid department.').optional(),
  designation: z.string().min(1, 'Designation is required'),
  joiningDate: z.string().or(z.date()).optional(),
  salaryGrade: z.string().optional(),
  role: z.enum(['teacher', 'hod', 'faculty', 'staff']).optional(),
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
  customFields: z.record(z.any()).nullish(),
});

export const createStaffSchema = staffBaseSchema
  .refine(data => (data.firstName && data.firstName.trim().length > 0) || (data.name && data.name.trim().length > 0), {
    message: 'Please enter the first name.',
    path: ['firstName'],
  })
  .refine(data => !!data.departmentId || !!data.department, {
    message: 'Please select a department.',
    path: ['departmentId'],
  });

// For updates: teacherId is still required if provided; cannot be set to empty
export const updateStaffSchema = staffBaseSchema
  .omit({ teacherId: true })
  .extend({
    teacherId: z.string()
      .trim()
      .min(1, 'Teacher ID cannot be empty.')
      .optional(),
  })
  .partial()
  .extend({
    firstName: z.string().trim().min(1, 'Please enter the first name.').optional(),
    name: z.string().trim().min(1, 'Please enter the first name.').optional(),
    departmentId: z.string().uuid('Please select a valid department.').optional(),
    // Validate email format when supplied during edits
    email: z
      .string()
      .trim()
      .email('Please enter a valid email address.')
      .optional()
      .or(z.literal('')),
  });
