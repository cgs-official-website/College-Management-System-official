import { z } from 'zod';

export const createExamSchema = z.object({
  name: z.string().min(1, 'Exam title/name is required'),
  subject: z.string().optional().default('General Subject'),
  courseId: z.string().optional(),
  courseName: z.string().optional(),
  departmentId: z.string().optional(),
  departmentName: z.string().optional(),
  date: z.string().optional(),
  maxMarks: z.number().or(z.string().transform(v => Number(v) || 100)).optional().default(100),
  type: z.string().min(1, 'Exam type is required').default('Midterm'),
  status: z.enum(['pending', 'active', 'completed']).optional().default('pending'),
  room: z.string().optional().default('Main Hall'),
<<<<<<< HEAD
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
=======
  hall: z.string().optional(),
>>>>>>> c52d622 (calender module  updated & bugs fixed)
});

export const updateExamSchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().optional(),
  courseId: z.string().optional(),
  courseName: z.string().optional(),
  date: z.string().optional(),
  maxMarks: z.number().or(z.string().transform(v => Number(v) || 100)).optional(),
  type: z.string().min(1).optional(),
  status: z.enum(['pending', 'active', 'completed']).optional(),
  room: z.string().optional(),
<<<<<<< HEAD
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
=======
  hall: z.string().optional(),
>>>>>>> c52d622 (calender module  updated & bugs fixed)
});

export const enterMarksSchema = z.object({
  studentId: z.string().uuid(),
  examId: z.string().uuid(),
  obtainedMarks: z.number().min(0),
  remarks: z.string().optional()
});

export const batchEnterMarksSchema = z.object({
  courseId: z.string().uuid(),
  examId: z.string().uuid().optional(),
  examType: z.string(),
  maxMarks: z.number().min(1).default(100),
  records: z.array(z.object({
    studentId: z.string().uuid(),
    obtainedMarks: z.number().min(0)
  }))
});
