import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { getEntities, createEntity, deleteEntity, getFieldsForModel, createField, createSection, deleteSection } from './builder.controller.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

router.use(authenticate, authorize('admin', 'superadmin'));

router.get('/entities', catchAsync(getEntities));
router.post('/entities', catchAsync(createEntity));
router.delete('/entities/:id', catchAsync(deleteEntity));
router.get('/fields/:model', catchAsync(getFieldsForModel));
router.post('/fields', catchAsync(createField));

router.post('/sections', catchAsync(createSection));
router.delete('/sections/:id', catchAsync(deleteSection));

export default router;
