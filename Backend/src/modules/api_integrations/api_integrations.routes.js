import { Router } from 'express';
import { getIntegrations, saveIntegration } from './api_integrations.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', requirePermission('api_integration', 'read'), catchAsync(getIntegrations));
router.post('/', requirePermission('api_integration', 'update'), catchAsync(saveIntegration));

export default router;
