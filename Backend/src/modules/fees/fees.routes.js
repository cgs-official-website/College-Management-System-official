import { Router } from 'express';
import { getFees, createFee, updateFee, deleteFee } from './fees.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', requirePermission('fees', 'read'), catchAsync(getFees));
router.post('/', requirePermission('fees', 'create'), catchAsync(createFee));
router.put('/:id', requirePermission('fees', 'update'), catchAsync(updateFee));
router.delete('/:id', requirePermission('fees', 'delete'), catchAsync(deleteFee));

export default router;
