import { Router } from 'express';
import { getTrafficAnalytics } from './traffic.controller.js';

const router = Router();

// Endpoint for superadmin traffic analytics
router.get('/stats', getTrafficAnalytics);
router.get('/', getTrafficAnalytics);

export default router;
