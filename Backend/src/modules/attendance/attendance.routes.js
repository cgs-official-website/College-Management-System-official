import { Router } from 'express';
import { markAttendance, getDailyAttendance } from './attendance.controller.js';
import { authorize } from '../../middleware/authorize.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/class/:courseId/date/:date', authorize('teacher', 'admin'), getDailyAttendance);
router.post('/mark', authorize('teacher', 'admin'), markAttendance);

export default router;
