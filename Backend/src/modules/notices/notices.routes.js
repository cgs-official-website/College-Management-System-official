import { Router } from 'express';
import { getNotices, createNotice, deleteNotice } from './notices.controller.js';
import { authorize } from '../../middleware/authorize.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', getNotices);
router.post('/', authorize('admin', 'teacher'), createNotice);
router.delete('/:id', authorize('admin'), deleteNotice);

export default router;
