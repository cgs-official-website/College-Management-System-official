import { Router } from 'express';
import { 
  markAttendance, 
  batchMarkAttendance, 
  getDailyAttendance, 
  getAttendanceStats 
} from './attendance.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/daily', catchAsync(getDailyAttendance));
router.get('/daily/:date', catchAsync(getDailyAttendance));
router.get('/class/:courseId/date/:date', catchAsync(getDailyAttendance));
router.get('/stats', catchAsync(getAttendanceStats));
router.post('/mark', catchAsync(markAttendance));
router.post('/batch-mark', catchAsync(batchMarkAttendance));

export default router;
