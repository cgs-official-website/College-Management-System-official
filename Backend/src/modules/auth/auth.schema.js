import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  collegeSlug: z.string().optional() // For multi-tenant resolution if needed
});

export const registerAdminSchema = z.object({
  collegeName: z.string().min(3),
  slug: z.string().min(3),
  adminEmail: z.string().email(),
  password: z.string().min(6)
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
