import { Router } from 'express';
import { getItems, createItem, deleteItem } from './hostel.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', requirePermission('hostel', 'read'), catchAsync(getItems));
router.post('/', requirePermission('hostel', 'create'), catchAsync(createItem));
router.delete('/:id', requirePermission('hostel', 'delete'), catchAsync(deleteItem));

export default router;
