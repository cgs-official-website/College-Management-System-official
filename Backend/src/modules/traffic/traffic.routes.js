import { Router } from 'express';
import { getTrafficAnalytics } from './traffic.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';

const router = Router();

// Endpoint for superadmin traffic analytics
router.get('/stats', authenticate, authorize('superadmin'), getTrafficAnalytics);
router.get('/', authenticate, authorize('superadmin'), getTrafficAnalytics);

export default router;
