import { Router } from 'express';
import { getAdmissions, submitApplication, updateAdmission, deleteAdmission, allotSeat } from './admissions.controller.js';
import { authorize } from '../../middleware/authorize.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', authorize('admin', 'superadmin'), catchAsync(getAdmissions));
router.post('/apply', authorize('admin', 'superadmin'), catchAsync(submitApplication));
router.post('/allot', authorize('admin', 'superadmin'), catchAsync(allotSeat));
router.put('/:id', authorize('admin', 'superadmin'), catchAsync(updateAdmission));
router.delete('/:id', authorize('admin', 'superadmin'), catchAsync(deleteAdmission));

export default router;
