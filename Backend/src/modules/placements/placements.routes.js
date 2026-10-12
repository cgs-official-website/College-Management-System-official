import { Router } from 'express';
import { getItems, createItem, deleteItem, updateItem } from './placements.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', catchAsync(getItems));
router.post('/', catchAsync(createItem));
router.patch('/:id', catchAsync(updateItem));
router.delete('/:id', catchAsync(deleteItem));

export default router;
