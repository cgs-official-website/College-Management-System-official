import { z } from 'zod';

const emptyToNull = (val) => (typeof val === 'string' && val.trim() === '' ? null : val);

const uuidOrNull = z.preprocess(emptyToNull, z.string().uuid().nullable().optional());

const phoneOrNull = (msg) => z.preprocess(
  emptyToNull,
  z.string().regex(/^[0-9]{10}$/, msg).nullable().optional()
);

const textOrNull = z.preprocess(emptyToNull, z.string().trim().nullable().optional());

const digitsOrNull = (len, msg) => z.preprocess(
  emptyToNull,
  z.string().regex(new RegExp(`^[0-9]{${len}}$`), msg).nullable().optional()
);

export const createStudentSchema = z.object({
  firstName: z.string({ required_error: 'First name is required' }).min(1, 'First name is required'),
  lastName: z.string().nullish().default(''),
  email: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim().toLowerCase() : (val === null || val === undefined ? undefined : val)),
    z.string().email('Invalid email address').optional()
  ),
  admissionNo: z.string().nullish(),
  admissionNumber: z.string().nullish(),
  rollNo: z.string().nullish(),
  rollNumber: z.string().nullish(),
  registerNumber: z.string().nullish(),
  studentRegNo: z.string().nullish(),
  regNo: z.string().nullish(),
  currentSemester: z.number().int().min(1).nullish(),

  // Required for new students
  courseId: z.string({ required_error: 'Course is required' }).uuid('Course is required'),
  sectionId: z.string({ required_error: 'Section is required' }).uuid('Section is required'),
  batchYear: z.string({ required_error: 'Batch year is required' }).regex(/^\d{4}$/, 'Batch year is required'),
  parentName: z.string({ required_error: 'Parent/guardian name is required' }).trim().min(1, 'Parent/guardian name is required'),
  parentPhone: z.string({ required_error: 'Parent phone is required' }).regex(/^[0-9]{10}$/, 'Parent phone must be exactly 10 digits.'),

  departmentId: uuidOrNull,
  hostelBlockId: uuidOrNull,
  department: z.string().nullish(),
  courseName: z.string().nullish(),
  class: z.string().nullish(),
  section: z.string().nullish(),
  fatherName: z.string().nullish(),
  parentMobile: phoneOrNull('Parent phone must be exactly 10 digits.'),
  phone: phoneOrNull('Phone number must be exactly 10 digits.'),
  studentMobile: phoneOrNull('Phone number must be exactly 10 digits.'),
  bloodGroup: z.string().nullish(),
  emergencyContact: z.preprocess(
    emptyToNull,
    z.string().regex(/^[0-9]+$/, 'Phone number must contain only digits.').nullable().optional()
  ),
  status: z.string().nullish(),
  address: z.string().nullish(),
  gender: z.string().nullish(),
  dob: z.string().nullish(),
  dateOfBirth: z.string().nullish(),
  residenceType: z.string().nullish(),
  transportRequired: z.enum(['Yes', 'No']).nullish(),
  hostelRoom: z.string().nullish(),
  collegeId: z.string().nullish(),
  customFields: z.record(z.any()).nullish(),

  // New optional fields
  motherName: textOrNull,
  nationality: textOrNull,
  communityCategory: textOrNull,
  city: textOrNull,
  district: textOrNull,
  state: textOrNull,
  pincode: digitsOrNull(6, 'Pincode must be exactly 6 digits.'),
  aadhaarNumber: digitsOrNull(12, 'Aadhaar must be exactly 12 digits.'),
});

// Updates stay lenient so partial updates from other screens still work
export const updateStudentSchema = createStudentSchema.partial().extend({
  courseId: uuidOrNull,
  sectionId: uuidOrNull,
  batchYear: z.string().nullish(),
  parentName: z.string().nullish(),
  parentPhone: phoneOrNull('Parent phone must be exactly 10 digits.'),
});