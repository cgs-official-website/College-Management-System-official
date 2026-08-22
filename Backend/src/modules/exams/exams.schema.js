import { z } from 'zod';

export const createExamSchema = z.object({
  name: z.string().min(1, 'Exam title/name is required'),
  subject: z.string().optional().default('General Subject'),
  courseId: z.string().optional(),
  courseName: z.string().optional(),
  date: z.string().optional(),
  maxMarks: z.number().or(z.string().transform(v => Number(v) || 100)).optional().default(100),
  type: z.enum(['Midterm', 'Final', 'Quiz', 'Practical', 'Internal', 'Semester']).optional().default('Midterm'),
  status: z.enum(['pending', 'active', 'completed']).optional().default('pending'),
  room: z.string().optional().default('Main Hall'),
});

export const updateExamSchema = createExamSchema.partial();

export const enterMarksSchema = z.object({
  studentId: z.string().uuid(),
  examId: z.string().uuid(),
  obtainedMarks: z.number().min(0),
  remarks: z.string().optional()
});

export const batchEnterMarksSchema = z.object({
  courseId: z.string().uuid(),
  examType: z.string(),
  maxMarks: z.number().min(1).default(100),
  records: z.array(z.object({
    studentId: z.string().uuid(),
    obtainedMarks: z.number().min(0)
  }))
});
