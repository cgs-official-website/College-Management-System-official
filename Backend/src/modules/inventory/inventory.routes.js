import { Router } from 'express';
import {
  getItems,
  createItem,
  updateItem,
  deleteItem,
  bulkImportInventory
} from './inventory.controller.js';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} from './category.controller.js';
import {
  getAuditLogs,
  getInboundLogs,
  getOutboundLogs,
  createStockMovement
} from './auditLog.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

router.use(authenticate, resolveTenant);

// -------------------------------------------------------------
// 1. PRODUCT CATEGORIES ROUTES
// -------------------------------------------------------------
router.get('/categories', requirePermission('inventory', 'read'), catchAsync(getCategories));
router.get('/categories/:id', requirePermission('inventory', 'read'), catchAsync(getCategoryById));
router.post('/categories', requirePermission('inventory', 'create'), catchAsync(createCategory));
router.patch('/categories/:id', requirePermission('inventory', 'update'), catchAsync(updateCategory));
router.put('/categories/:id', requirePermission('inventory', 'update'), catchAsync(updateCategory));
router.delete('/categories/:id', requirePermission('inventory', 'delete'), catchAsync(deleteCategory));

// -------------------------------------------------------------
// 2. INVENTORY AUDIT LOGS & STOCK MOVEMENTS ROUTES
// -------------------------------------------------------------
router.get('/audit-logs', requirePermission('inventory', 'read'), catchAsync(getAuditLogs));
router.get('/audit-logs/inbound', requirePermission('inventory', 'read'), catchAsync(getInboundLogs));
router.get('/audit-logs/outbound', requirePermission('inventory', 'read'), catchAsync(getOutboundLogs));
router.post('/movements', requirePermission('inventory', 'create'), catchAsync(createStockMovement));

// -------------------------------------------------------------
// 3. INVENTORY PRODUCT ITEMS ROUTES
// -------------------------------------------------------------
router.get('/', requirePermission('inventory', 'read'), catchAsync(getItems));
router.post('/', requirePermission('inventory', 'create'), catchAsync(createItem));
router.post('/bulk', requirePermission('inventory', 'create'), catchAsync(bulkImportInventory));
router.put('/:id', requirePermission('inventory', 'update'), catchAsync(updateItem));
router.delete('/:id', requirePermission('inventory', 'delete'), catchAsync(deleteItem));

export default router;
