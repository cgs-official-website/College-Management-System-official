import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Please enter a valid email address').optional(),
  identifier: z.string().trim().optional(),
  password: z.string().min(1, 'Password is required'),
  collegeSlug: z.string().trim().optional()
}).refine(data => data.email || data.identifier, {
  message: 'Email is required'
});

export const registerAdminSchema = z.object({
  collegeName: z.string().trim().min(2, 'College name must be at least 2 characters'),
  slug: z.string().trim().optional(),
  adminEmail: z.string().trim().email('Please enter a valid email address').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().trim().optional(),
  aicteNumber: z.string().trim().optional().nullable(),
  ugcRecognition: z.string().trim().optional().nullable(),
  affiliationCode: z.string().trim().regex(/^[A-Za-z0-9]{10,15}$/, 'Affiliation code must be 10-15 alphanumeric characters'),
  aicteCode: z.string().trim().regex(/^[A-Za-z0-9]{15,20}$/, 'AICTE code must be 15-20 alphanumeric characters'),
  pan: z.string().trim().toUpperCase().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format'),
  tan: z.string().trim().toUpperCase().regex(/^[A-Z]{4}[0-9]{5}[A-Z]{1}$/, 'Invalid TAN format'),
  affiliationType: z.enum(['AUTONOMOUS', 'UNIVERSITY'], { required_error: 'Affiliation type is required' }),
  ugcCode: z.string().trim().optional(),
  logoUrl: z.string().trim().optional().nullable(),
  logoBase64: z.string().trim().optional().nullable()
}).superRefine((data, ctx) => {
  if (data.affiliationType === 'UNIVERSITY') {
    if (!data.ugcCode || data.ugcCode.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'UGC Code is required for affiliated universities',
        path: ['ugcCode']
      });
    } else if (!/^[A-Za-z0-9]+$/.test(data.ugcCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'UGC Code must be alphanumeric',
        path: ['ugcCode']
      });
    }
  }
});

export const studentRegisterSchema = z.object({
  token: z.string().trim().min(1, 'Registration token is required'),
  admissionNumber: z.string().trim().min(1, 'Admission number is required'),
  email: z.string().trim().email('Valid email is required').toLowerCase(),
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().optional().default(''),
  phone: z.string().trim().optional().nullable(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6)
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
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
