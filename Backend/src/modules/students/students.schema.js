import { z } from 'zod';

export const createStudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional().default(''),
  email: z.string().email('Invalid email address'),
  admissionNo: z.string().optional(),
  admissionNumber: z.string().optional(),
  rollNo: z.string().optional(),
  rollNumber: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  department: z.string().optional(),
  batchYear: z.string().optional(),
  class: z.string().optional(),
  section: z.string().optional(),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  phone: z.string().optional(),
  bloodGroup: z.string().optional(),
  emergencyContact: z.string().optional(),
  status: z.string().optional().default('active'),
});

export const updateStudentSchema = createStudentSchema.partial();
