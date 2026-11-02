import { z } from 'zod';

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').regex(emailRegex, 'Please enter a valid email address with a valid domain').optional(),
  identifier: z.string().trim().optional(),
  password: z.string().min(1, 'Password is required'),
  collegeSlug: z.string().trim().optional()
}).refine(data => data.email || data.identifier, {
  message: 'Email is required'
});

export const registerAdminSchema = z.object({
  collegeName: z.string().trim().min(2, 'College name must be at least 2 characters'),
  slug: z.string().trim().optional().nullable(),
  adminEmail: z.string().trim().email('Please enter a valid email address').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().trim().optional().nullable(),
  aicteNumber: z.string().trim().optional().nullable(),
  ugcRecognition: z.string().trim().optional().nullable(),
  affiliationCode: z.string().trim().optional().nullable(),
  aicteCode: z.string().trim().optional().nullable(),
  pan: z.string().trim().toUpperCase().optional().nullable(),
  tan: z.string().trim().toUpperCase().optional().nullable(),
  affiliationType: z.preprocess((val) => (typeof val === 'string' && val.trim() ? val.trim().toUpperCase() : 'AUTONOMOUS'), z.enum(['AUTONOMOUS', 'UNIVERSITY'])).optional().default('AUTONOMOUS'),
  ugcCode: z.string().trim().optional().nullable(),
  logoUrl: z.string().trim().optional().nullable(),
  logoBase64: z.string().trim().optional().nullable()
});

const emptyToNull = (v) => (typeof v === 'string' && v.trim() === '' ? null : v);
const optText = z.preprocess(emptyToNull, z.string().trim().nullable().optional());
const optDigits = (len, msg) => z.preprocess(
  emptyToNull,
  z.string().regex(new RegExp(`^[0-9]{${len}}$`), msg).nullable().optional()
);

export const studentRegisterSchema = z.object({
  token: z.string().trim().min(1, 'Registration token cannot be empty').optional(),
  collegeId: z.string().uuid('Invalid college ID').optional(),
  admissionNumber: z.string().trim().optional().default(''),
  email: z.string().trim().email('Valid email is required').toLowerCase(),
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().optional().default(''),
  phone: optDigits(10, 'Phone must be 10 digits'),
  dob: z.string({ required_error: 'Date of birth is required' }).trim().min(1, 'Date of birth is required'),
  gender: z.string().trim().min(1, 'Gender is required'),
  courseId: z.string({ required_error: 'Course is required' }).uuid('Course is required'),
  sectionId: z.string({ required_error: 'Section is required' }).uuid('Section is required'),
  registerNumber: z.string().trim().min(1, 'University Reg.No is required'),
  rollNumber: optText,
  currentSemester: z.number({ required_error: 'Current semester is required' }).int().min(1, 'Current semester is required'),
  batchYear: z.string().regex(/^\d{4}$/, 'Batch year is required'),
  parentName: z.string().trim().min(1, 'Parent/guardian name is required'),
  parentPhone: z.string().regex(/^[0-9]{10}$/, 'Parent phone must be 10 digits'),
  emergencyContact: optDigits(10, 'Emergency contact must be 10 digits'),
  bloodGroup: optText,
  motherName: optText,
  nationality: optText,
  communityCategory: optText,
  city: optText,
  district: optText,
  state: optText,
  pincode: optDigits(6, 'Pincode must be 6 digits'),
  aadhaarNumber: optDigits(12, 'Aadhaar must be 12 digits'),
  address: z.string().trim().optional().nullable(),
  residenceType: z.string().trim().optional().default('Day Scholar'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6)
})
  .refine(data => Boolean(data.token || data.collegeId), {
    message: 'A valid student registration link is required',
    path: ['token']
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ['confirmPassword']
  });

export const studentActivationSchema = z.object({
  token: z.string().trim().min(1).optional(),
  collegeId: z.string().uuid('Invalid college ID').optional(),
  admissionNumber: z.string().trim().min(1, 'Admission number is required'),
  email: z.string().trim().email('Valid email is required').toLowerCase(),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional().default(''),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6)
}).refine(data => Boolean(data.token || data.collegeId), {
  message: 'A valid student registration link is required',
  path: ['token']
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string()
});

export const forgotPasswordSchema = z.object({
  email: z.string().email()
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  userId: z.string().uuid(),
  password: z.string().min(6, "Password must be at least 6 characters long")
});

export const staffSetupSchema = z.object({
  token: z.string().min(1, 'Setup token is required.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters.'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

/**
 * Schema for Step 1 of the new teacher flow:
 * Teacher opens Registration Link and provides their own name + email.
 * No password at this stage — password is set via the Setup Link (Step 2).
 */
export const teacherRegisterSchema = z.object({
  token: z.string().min(1, 'Registration token is required.'),
  firstName: z.string().trim().min(1, 'First name is required.'),
  lastName: z.string().trim().optional().default(''),
  email: z.string().trim().email('A valid email address is required.').toLowerCase(),
});
