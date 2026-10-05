import { Router } from 'express';
import {
  getLeaveRequests,
  updateLeaveRequestStatus,
  getLeaveRoles,
  createStaffLeave,
  getMyLeaves,
  getLeaveProof
} from './leaves.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/roles', catchAsync(getLeaveRoles));
router.get('/my', catchAsync(getMyLeaves));
router.post('/staff', catchAsync(createStaffLeave));

router.get('/', catchAsync(getLeaveRequests));
router.get('/:id/proof', catchAsync(getLeaveProof));
router.patch('/:id/status', catchAsync(updateLeaveRequestStatus));
router.put('/:id/status', catchAsync(updateLeaveRequestStatus));

export default router;