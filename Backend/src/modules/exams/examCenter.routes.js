import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { catchAsync } from '../../lib/catchAsync.js';
import {
  listExamTypes, createExamType, updateExamType, deleteExamType,
  previewSchedule, createSchedule, listSchedule, updateScheduleItem, deleteScheduleItem,
  getReview, reviewAction, publishAll,
  teacherClasses, getMarksSheet, saveMarks, submitMarks,
} from './examCenter.controller.js';

const router = Router();

router.use(authenticate, resolveTenant);

const adminOnly = authorize('admin', 'superadmin');
const teacherOnly = authorize('teacher', 'hod', 'faculty');
const staffOnly = authorize('admin', 'superadmin', 'teacher', 'hod', 'faculty');

// Exam types
router.get('/types', staffOnly, catchAsync(listExamTypes));
router.post('/types', adminOnly, catchAsync(createExamType));
router.put('/types/:id', adminOnly, catchAsync(updateExamType));
router.delete('/types/:id', adminOnly, catchAsync(deleteExamType));

// Scheduling
router.get('/schedule/preview', adminOnly, catchAsync(previewSchedule));
router.get('/schedule', adminOnly, catchAsync(listSchedule));
router.post('/schedule', adminOnly, catchAsync(createSchedule));
router.put('/schedule/:id', adminOnly, catchAsync(updateScheduleItem));
router.delete('/schedule/:id', adminOnly, catchAsync(deleteScheduleItem));

// Admin review and publishing
router.get('/review', adminOnly, catchAsync(getReview));
router.post('/review/action', adminOnly, catchAsync(reviewAction));
router.post('/review/publish-all', adminOnly, catchAsync(publishAll));

// Teacher
router.get('/teacher/classes', teacherOnly, catchAsync(teacherClasses));
router.get('/marks/:examId/:sectionId', staffOnly, catchAsync(getMarksSheet));
router.put('/marks/:examId/:sectionId', teacherOnly, catchAsync(saveMarks));
router.post('/marks/:examId/:sectionId/submit', teacherOnly, catchAsync(submitMarks));

export default router;