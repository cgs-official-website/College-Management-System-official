import { z } from 'zod';

const optStr = (max = 200) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(max).nullable().optional()
  );

export const updateProfileSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required.').max(60),
    lastName: z.string().trim().max(60).optional().default(''),
    mobileNumber: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
      z.string().regex(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits.').nullable().optional()
    ),
    gender: optStr(20),
    dateOfBirth: z.preprocess(
      (v) => (v === '' || v === undefined ? null : v),
      z
        .string()
        .refine((d) => !Number.isNaN(Date.parse(d)) && new Date(d) < new Date(), 'Enter a valid date of birth.')
        .nullable()
        .optional()
    ),
    bloodGroup: optStr(5),
    qualification: optStr(120),
    experienceYears: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
      z.number().int().min(0).max(60).nullable().optional()
    ),
    designation: optStr(80),
    joiningDate: z.preprocess(
      (v) => (v === '' || v === undefined ? null : v),
      z.string().refine((d) => !Number.isNaN(Date.parse(d)), 'Enter a valid joining date.').nullable().optional()
    ),
    employmentType: optStr(40),
    salaryGrade: optStr(40),
    aadhaarNumber: z.preprocess(
      (v) => {
        if (typeof v !== 'string') return v;
        const s = v.replace(/\s/g, '');
        return s === '' ? null : s;
      },
      z.string().regex(/^[0-9]{12}$/, 'Aadhaar must be 12 digits.').nullable().optional()
    ),
    panNumber: z.preprocess(
      (v) => {
        if (typeof v !== 'string') return v;
        const s = v.trim().toUpperCase();
        return s === '' ? null : s;
      },
      z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'PAN must look like ABCDE1234F.').nullable().optional()
    ),
    address: optStr(300),
    city: optStr(80),
    district: optStr(80),
    state: optStr(80),
    pincode: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
      z.string().regex(/^[0-9]{6}$/, 'Pincode must be 6 digits.').nullable().optional()
    ),
    emergencyContactName: optStr(80),
    emergencyContactNumber: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
      z.string().regex(/^[0-9]{10}$/, 'Emergency number must be exactly 10 digits.').nullable().optional()
    ),
  })
  .strict();

export const photoSchema = z.object({
  image: z.string().min(1, 'Image is required.'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters.').max(100),
});
