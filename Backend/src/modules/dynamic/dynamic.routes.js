import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { getDynamicRecords, createDynamicRecord, updateDynamicRecord, deleteDynamicRecord } from './dynamic.controller.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

router.use(authenticate, authorize('admin', 'superadmin'));

router.get('/:entitySlug', catchAsync(getDynamicRecords));
router.post('/:entitySlug', catchAsync(createDynamicRecord));
router.put('/:entitySlug/:id', catchAsync(updateDynamicRecord));
router.delete('/:entitySlug/:id', catchAsync(deleteDynamicRecord));

export default router;
