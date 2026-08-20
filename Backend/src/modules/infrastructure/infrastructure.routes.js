import { Router } from 'express';
import { getAssets, createAsset, deleteAsset } from './infrastructure.controller.js';
import { authorize } from '../../middleware/authorize.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', authorize('admin'), getAssets);
router.post('/', authorize('admin'), createAsset);
router.delete('/:id', authorize('admin'), deleteAsset);

export default router;
