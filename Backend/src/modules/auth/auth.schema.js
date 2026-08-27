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
  affiliationCode: z.string().trim().optional().nullable(),
  logoUrl: z.string().trim().optional().nullable(),
  logoBase64: z.string().trim().optional().nullable()
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
