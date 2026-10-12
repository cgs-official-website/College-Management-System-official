import { Router } from 'express';
import { updateProfile, getUsers, deleteUser, assignUserRole, changePassword } from './users.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { authorize } from '../../middleware/authorize.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

router.use(authenticate);

router.get('/', resolveTenant, catchAsync(getUsers));
router.delete('/:id', resolveTenant, authorize('admin', 'superadmin'), catchAsync(deleteUser));
router.put('/:id/role', resolveTenant, authorize('admin', 'superadmin'), catchAsync(assignUserRole));
router.put('/profile', catchAsync(updateProfile));
router.put('/change-password', catchAsync(changePassword));

export default router;
