import { z } from 'zod';

// Helper: convert empty string / whitespace to null before UUID validation
const uuidOrNull = z.preprocess(
  (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
  z.string().uuid().nullable().optional()
);

// Helper: convert empty string / whitespace to null before phone validation
const phoneOrNull = (msg) => z.preprocess(
  (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
  z.string().regex(/^[0-9]{10}$/, msg).nullable().optional()
);

export const createStudentSchema = z.object({
  firstName: z.string({ required_error: 'First name is required' }).min(1, 'First name is required'),
  lastName: z.string().nullish().default(''),
  // email is optional in the schema; createStudent controller enforces it separately
  email: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim().toLowerCase() : (val === null || val === undefined ? undefined : val)),
    z.string().email('Invalid email address').optional()
  ),
  admissionNo: z.string().nullish(),
  admissionNumber: z.string().nullish(),
  rollNo: z.string().nullish(),
  rollNumber: z.string().nullish(),
  // UUID fields — empty string is treated as null (no section/course selected)
  departmentId: uuidOrNull,
  courseId:     uuidOrNull,
  sectionId:    uuidOrNull,
  hostelBlockId: uuidOrNull,
  department: z.string().nullish(),
  batchYear: z.string().nullish(),
  courseName: z.string().nullish(),
  class: z.string().nullish(),
  section: z.string().nullish(),
  parentName: z.string().nullish(),
  fatherName: z.string().nullish(),
  parentPhone:   phoneOrNull('Parent phone must be exactly 10 digits.'),
  parentMobile:  phoneOrNull('Parent phone must be exactly 10 digits.'),
  phone:         phoneOrNull('Phone number must be exactly 10 digits.'),
  studentMobile: phoneOrNull('Phone number must be exactly 10 digits.'),
  bloodGroup: z.string().nullish(),
  emergencyContact: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
    z.string().regex(/^[0-9]+$/, 'Phone number must contain only digits.').nullable().optional()
  ),
  status: z.string().nullish(),
  address: z.string().nullish(),
  gender: z.string().nullish(),
  dob: z.string().nullish(),
  dateOfBirth: z.string().nullish(),
  residenceType: z.string().nullish(),
  hostelRoom: z.string().nullish(),
  collegeId: z.string().nullish(),
});

export const updateStudentSchema = createStudentSchema.partial();
