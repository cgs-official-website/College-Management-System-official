import { Router } from 'express';
import { getDashboardStats, getTeacherStats } from './dashboards.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/stats', getDashboardStats);
router.get('/teacher-stats', getTeacherStats);

export default router;
