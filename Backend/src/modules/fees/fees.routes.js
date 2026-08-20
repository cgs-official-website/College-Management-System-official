import { Router } from 'express';
import { getFees, createFee, updateFee, deleteFee } from './fees.controller.js';
import { authorize } from '../../middleware/authorize.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', authorize('admin', 'student', 'parent'), getFees);
router.post('/', authorize('admin'), createFee);
router.put('/:id', authorize('admin'), updateFee);
router.delete('/:id', authorize('admin'), deleteFee);

export default router;
