import { z } from 'zod';

export const createStudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().nullish().default(''),
  email: z.string().email('Invalid email address'),
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
  parentPhone: z.string().nullish(),
  phone: z.string().nullish(),
  bloodGroup: z.string().nullish(),
  emergencyContact: z.string().nullish(),
  status: z.string().nullish().default('active'),
  address: z.string().nullish(),
  gender: z.string().nullish(),
  dateOfBirth: z.string().nullish(),
  residenceType: z.string().nullish().default('Day Scholar'),
  hostelBlockId: z.string().uuid().nullish(),
  hostelRoom: z.string().nullish(),
});

export const updateStudentSchema = createStudentSchema.partial();
