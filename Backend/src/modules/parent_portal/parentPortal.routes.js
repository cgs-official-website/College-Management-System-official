import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveParent } from './parentResolver.js';
import { catchAsync } from '../../lib/catchAsync.js';
import {
  getParentProfile,
  getParentDashboard,
  getParentAttendance,
  getParentGrades,
  getParentHostel,
  getParentTransport,
  getParentFees,
  payParentFee,
  getParentPTM,
  bookParentPTM
} from './parentPortal.controller.js';

const router = Router();

// All parent portal endpoints require active parent authentication and resolver
router.use(authenticate, resolveParent);

router.get('/me', catchAsync(getParentProfile));
router.get('/profile', catchAsync(getParentProfile));
router.get('/dashboard', catchAsync(getParentDashboard));
router.get('/attendance', catchAsync(getParentAttendance));
router.get('/grades', catchAsync(getParentGrades));
router.get('/hostel', catchAsync(getParentHostel));
router.get('/transport', catchAsync(getParentTransport));

// Fees and payment routes
router.get('/fees', catchAsync(getParentFees));
router.post('/fees/pay', catchAsync(payParentFee));

// Parent-Teacher Meeting routes
router.get('/ptm', catchAsync(getParentPTM));
router.post('/ptm/book', catchAsync(bookParentPTM));

export default router;
