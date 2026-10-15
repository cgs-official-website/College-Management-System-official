import { Router } from 'express';
import { getNotices, getNoticeById, createNotice, updateNotice, deleteNotice } from './notices.controller.js';
import { authorize } from '../../middleware/authorize.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { requirePermission } from '../../middleware/requirePermission.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', requirePermission('notices', 'read'), getNotices);
router.get('/:id', requirePermission('notices', 'read'), getNoticeById);
router.post('/', requirePermission('notices', 'create'), createNotice);
router.put('/:id', requirePermission('notices', 'update'), updateNotice);
router.patch('/:id', requirePermission('notices', 'update'), updateNotice);
router.delete('/:id', requirePermission('notices', 'delete'), deleteNotice);
export default router;
