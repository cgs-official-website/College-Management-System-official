import { Router } from 'express';
import { 
  markAttendance, 
  batchMarkAttendance, 
  getDailyAttendance, 
  getAttendanceStats 
} from './attendance.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

router.use(authenticate, resolveTenant);

// Only staff roles can use the attendance APIs (students use the student portal routes)
const staffOnly = authorize('admin', 'superadmin', 'teacher', 'hod', 'faculty');

router.get('/daily', staffOnly, catchAsync(getDailyAttendance));
router.get('/daily/:date', staffOnly, catchAsync(getDailyAttendance));
router.get('/class/:courseId/date/:date', staffOnly, catchAsync(getDailyAttendance));
router.get('/stats', staffOnly, catchAsync(getAttendanceStats));
router.post('/mark', staffOnly, catchAsync(markAttendance));
router.post('/batch-mark', staffOnly, catchAsync(batchMarkAttendance));

export default router;