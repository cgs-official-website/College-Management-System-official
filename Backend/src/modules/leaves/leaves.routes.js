import { Router } from 'express';
import { getLeaveRequests, updateLeaveRequestStatus } from './leaves.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', catchAsync(getLeaveRequests));
router.patch('/:id/status', catchAsync(updateLeaveRequestStatus));
router.put('/:id/status', catchAsync(updateLeaveRequestStatus));

export default router;
