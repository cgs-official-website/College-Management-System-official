import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { getAttendanceReport } from './attendance.controller.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize('admin', 'superadmin'),
  catchAsync(getAttendanceReport)
);

export default router;
