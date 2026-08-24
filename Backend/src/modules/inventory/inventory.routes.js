import { Router } from 'express';
import { getItems, createItem, updateItem, deleteItem, bulkImportInventory } from './inventory.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', requirePermission('inventory', 'read'), catchAsync(getItems));
router.post('/', requirePermission('inventory', 'create'), catchAsync(createItem));
router.post('/bulk', requirePermission('inventory', 'create'), catchAsync(bulkImportInventory));
router.put('/:id', requirePermission('inventory', 'update'), catchAsync(updateItem));
router.delete('/:id', requirePermission('inventory', 'delete'), catchAsync(deleteItem));

export default router;
