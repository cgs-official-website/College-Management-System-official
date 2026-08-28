import { z } from 'zod';

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const phoneRegex = /^[6-9]\d{9}$/;

export const onboardCollegeSchema = z.object({
  adminUser: z.object({
    name: z.string().trim().min(1, 'Admin name is required'),
    email: z.string().trim().regex(emailRegex, 'Please enter a valid admin email address with a valid domain (e.g. .com, .edu, .in)').toLowerCase(),
    password: z.string().min(6, 'Password must be at least 6 characters')
  }),
  collegeData: z.object({
    name: z.string().trim().min(1, 'College name is required'),
    shortName: z.string().trim().optional(),
    email: z.string().trim().regex(emailRegex, 'Please enter a valid official email address with a valid domain (e.g. .com, .edu, .in)').toLowerCase(),
    phone: z.string().trim().refine(val => !val || phoneRegex.test(val), {
      message: 'Official phone must be a valid 10-digit mobile number'
    }).optional().nullable(),
    category: z.string().trim().optional(),
    establishedYear: z.string().trim().optional(),
    affiliatedBoard: z.string().trim().optional(),
    websiteUrl: z.string().trim().optional(),
    logoBase64: z.string().optional(),
    aicteNumber: z.string().trim().optional(),
    ugcRecognition: z.string().trim().optional(),
    affiliationCode: z.string().trim().optional(),
    gstin: z.string().trim().optional(),
    streetAddress: z.string().trim().optional(),
    city: z.string().trim().optional(),
    district: z.string().trim().optional(),
    state: z.string().trim().optional(),
    country: z.string().trim().optional(),
    pincode: z.string().trim().optional()
  })
});

export const updateCollegeStatusSchema = z.object({
  status: z.enum(['active', 'pending', 'suspended'])
});

export const updateSubscriptionSchema = z.object({
  planTier: z.string().min(1, 'Plan tier is required'),
  status: z.string().optional().default('Active'),
  currentPeriodEnd: z.string().optional().nullable()
});

