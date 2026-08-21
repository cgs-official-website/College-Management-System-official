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
