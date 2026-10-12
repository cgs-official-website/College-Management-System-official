import { Router } from 'express';
import { getStaff, createStaff, updateStaff, deleteStaff, bulkImportStaff } from './staff.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', requirePermission('staff', 'read'), catchAsync(getStaff));
// NOTE: The Setup Link is generated automatically after teacher self-registration.
router.post('/', requirePermission('staff', 'create'), catchAsync(createStaff));
router.post('/bulk', requirePermission('staff', 'create'), catchAsync(bulkImportStaff));
router.put('/:id', requirePermission('staff', 'update'), catchAsync(updateStaff));
router.delete('/:id', requirePermission('staff', 'delete'), catchAsync(deleteStaff));

export default router;
