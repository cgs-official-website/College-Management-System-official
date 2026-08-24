import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { getCustomRecords, createCustomRecord, updateCustomRecord, deleteCustomRecord } from './custom.controller.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

// Basic CRUD endpoints using actual middleware structure
router.get('/', authenticate, authorize('admin', 'superadmin'), catchAsync(getCustomRecords));
router.post('/', authenticate, authorize('admin', 'superadmin'), catchAsync(createCustomRecord));
router.put('/:id', authenticate, authorize('admin', 'superadmin'), catchAsync(updateCustomRecord));
router.delete('/:id', authenticate, authorize('admin', 'superadmin'), catchAsync(deleteCustomRecord));

export default router;
