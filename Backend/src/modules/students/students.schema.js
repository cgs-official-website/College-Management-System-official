import { z } from 'zod';

export const createStudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().nullish().default(''),
  email: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : (val === null || val === undefined ? '' : val)),
    z.string()
      .min(1, 'Email Address is required.')
      .email('Invalid email address')
  ).transform(val => val.toLowerCase()),
  admissionNo: z.string().nullish(),
  admissionNumber: z.string().nullish(),
  rollNo: z.string().nullish(),
  rollNumber: z.string().nullish(),
  departmentId: z.string().uuid().nullish(),
  department: z.string().nullish(),
  batchYear: z.string().nullish(),
  courseId: z.string().uuid().nullish(),
  class: z.string().nullish(),
  sectionId: z.string().uuid().nullish(),
  section: z.string().nullish(),
  parentName: z.string().nullish(),
  parentPhone: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
    z.string().regex(/^[0-9]+$/, 'Parent phone must contain only digits.').nullable().optional()
  ),
  phone: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
    z.string().regex(/^[0-9]+$/, 'Phone number must contain only digits.').nullable().optional()
  ),
  bloodGroup: z.string().nullish(),
  emergencyContact: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
    z.string().regex(/^[0-9]+$/, 'Phone number must contain only digits.').nullable().optional()
  ),
  status: z.string().nullish().default('active'),
  address: z.string().nullish(),
  gender: z.string().nullish(),
  dateOfBirth: z.string().nullish(),
  residenceType: z.string().nullish().default('Day Scholar'),
  hostelBlockId: z.string().uuid().nullish(),
  hostelRoom: z.string().nullish(),
});

export const updateStudentSchema = createStudentSchema.partial();
