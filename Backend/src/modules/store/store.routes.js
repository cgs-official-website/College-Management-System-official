import express from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { catchAsync } from '../../lib/catchAsync.js';
import { imageUpload } from './store.upload.js';
import {
  getItems,
  createItem,
  updateItem,
  deleteItem,
  uploadImage,
  bulkImportItems,
} from './store.controller.js';
import {
  getCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory,
} from './store.category.controller.js';
import { restockItem, adjustItem, getMovements } from './store.stock.controller.js';
import { createSale, getSales, getSaleById } from './store.sales.controller.js';
import { getSaleBillPdf } from './store.bill.controller.js';

const router = express.Router();

router.use(authenticate, resolveTenant);

router.post('/upload', requirePermission('store', 'create'), imageUpload, catchAsync(uploadImage));

router.get('/', requirePermission('store', 'read'), catchAsync(getItems));
router.post('/', requirePermission('store', 'create'), catchAsync(createItem));
router.patch('/:id', requirePermission('store', 'update'), catchAsync(updateItem));
router.delete('/:id', requirePermission('store', 'delete'), catchAsync(deleteItem));

router.get('/categories', requirePermission('store', 'read'), catchAsync(getCategories));
router.post('/categories', requirePermission('store', 'create'), catchAsync(createCategory));
router.patch('/categories/:id', requirePermission('store', 'update'), catchAsync(updateCategory));
router.delete('/categories/:id', requirePermission('store', 'delete'), catchAsync(deleteCategory));

router.post('/:id/restock', requirePermission('store', 'update'), catchAsync(restockItem));
router.post('/:id/adjust', requirePermission('store', 'update'), catchAsync(adjustItem));
router.get('/:id/movements', requirePermission('store', 'read'), catchAsync(getMovements));
router.post('/bulk', requirePermission('store', 'create'), catchAsync(bulkImportItems));

router.post('/sales', requirePermission('store', 'create'), catchAsync(createSale));
router.get('/sales', requirePermission('store', 'read'), catchAsync(getSales));
router.get('/sales/:id/pdf', requirePermission('store', 'read'), catchAsync(getSaleBillPdf));
router.get('/sales/:id', requirePermission('store', 'read'), catchAsync(getSaleById));
export default router;