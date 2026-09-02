import { z } from 'zod';

export const onboardCollegeSchema = z.object({
  adminUser: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6)
  }),
  collegeData: z.object({
    name: z.string().min(1),
    shortName: z.string().optional(),
    email: z.string().email(),
    phone: z.string().optional(),
    category: z.string().optional(),
    establishedYear: z.string().optional(),
    affiliatedBoard: z.string().optional(),
    websiteUrl: z.string().optional(),
    logoBase64: z.string().optional(),
    aicteNumber: z.string().optional(),
    ugcRecognition: z.string().optional(),
    affiliationCode: z.string().optional(),
    gstin: z.string().optional(),
    streetAddress: z.string().optional(),
    city: z.string().optional(),
    district: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    pincode: z.string().optional()
  })
});

export const updateCollegeStatusSchema = z.object({
  status: z.enum(['active', 'pending', 'suspended'])
});

export const updateCollegeSchema = z.object({
  name: z.string().min(1, 'College name is required').optional(),
  contactEmail: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
    z.string().email('Invalid contact email address').nullable().optional()
  ),
  contactPhone: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
    z.string()
      .regex(/^[0-9]{10}$/, 'Contact phone must be exactly 10 digits.')
      .nullable()
      .optional()
  ),
  address: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  academicYear: z.string().nullable().optional(),
  affiliationCode: z.string().nullable().optional(),
  aicteNumber: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  ugcCode: z.string().nullable().optional(),
});

