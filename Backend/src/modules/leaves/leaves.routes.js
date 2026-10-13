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
import { authorize } from '../../middleware/authorize.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

router.use(authenticate, resolveTenant);

// Staff roles only (students must not approve/reject leaves or list all requests)
const staffOnly = authorize('admin', 'superadmin', 'teacher', 'hod', 'faculty');

// Open to any logged-in user (own data)
router.get('/roles', catchAsync(getLeaveRoles));
router.get('/my', catchAsync(getMyLeaves));
router.get('/:id/proof', catchAsync(getLeaveProof));

// Staff only
router.post('/staff', staffOnly, catchAsync(createStaffLeave));
router.get('/', staffOnly, catchAsync(getLeaveRequests));
router.patch('/:id/status', staffOnly, catchAsync(updateLeaveRequestStatus));
router.put('/:id/status', staffOnly, catchAsync(updateLeaveRequestStatus));

export default router;