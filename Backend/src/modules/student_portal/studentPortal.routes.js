import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveStudent } from './studentResolver.js';
import { catchAsync } from '../../lib/catchAsync.js';
import {
  getStudentProfile,
  getStudentDashboard,
  getStudentCourses,
  getStudentAssignments,
  submitStudentAssignment,
  getStudentAttendance,
  getStudentLeaveRequests,
  createStudentLeaveRequest,
  getStudentTimetable,
  getStudentExams,
  getStudentResults,
  getStudentFees,
  getStudentNotices,
  getStudentLibrary,
  getStudentPlacements,
  getStudentComplaints,
  createStudentComplaint,
  getStudentHostel,
  getStudentTransport,
  getStudentDocuments
} from './studentPortal.controller.js';

const router = Router();

// All student portal endpoints require active student authentication & resolver
router.use(authenticate, resolveStudent);

router.get('/me', catchAsync(getStudentProfile));
router.get('/profile', catchAsync(getStudentProfile));
router.get('/dashboard', catchAsync(getStudentDashboard));
router.get('/courses', catchAsync(getStudentCourses));
router.get('/assignments', catchAsync(getStudentAssignments));
router.post('/assignments/:id/submit', catchAsync(submitStudentAssignment));
router.get('/attendance', catchAsync(getStudentAttendance));
router.get('/leave-requests', catchAsync(getStudentLeaveRequests));
router.post('/leave-requests', catchAsync(createStudentLeaveRequest));
router.get('/timetable', catchAsync(getStudentTimetable));
router.get('/exams', catchAsync(getStudentExams));
router.get('/results', catchAsync(getStudentResults));
router.get('/fees', catchAsync(getStudentFees));
router.get('/notices', catchAsync(getStudentNotices));
router.get('/library', catchAsync(getStudentLibrary));
router.get('/placements', catchAsync(getStudentPlacements));
router.get('/complaints', catchAsync(getStudentComplaints));
router.post('/complaints', catchAsync(createStudentComplaint));
router.get('/hostel', catchAsync(getStudentHostel));
router.get('/transport', catchAsync(getStudentTransport));
router.get('/documents', catchAsync(getStudentDocuments));

export default router;
