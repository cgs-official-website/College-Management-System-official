import { Router } from 'express';
import { getLibraryItems, createLibraryItem, deleteLibraryItem } from './library.controller.js';
import { authorize } from '../../middleware/authorize.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', authorize('admin', 'teacher', 'student'), getLibraryItems);
router.post('/', authorize('admin', 'teacher'), createLibraryItem);
router.delete('/:id', authorize('admin'), deleteLibraryItem);

export default router;
