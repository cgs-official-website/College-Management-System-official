import { Router } from 'express';
import { getStaff, createStaff, updateStaff, deleteStaff } from './staff.controller.js';
import { authorize } from '../../middleware/authorize.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', authorize('admin', 'teacher', 'student', 'parent'), getStaff);
router.post('/', authorize('admin'), createStaff);
router.put('/:id', authorize('admin'), updateStaff);
router.delete('/:id', authorize('admin'), deleteStaff);

export default router;
