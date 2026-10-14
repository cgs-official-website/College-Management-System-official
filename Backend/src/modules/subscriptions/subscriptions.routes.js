import { Router } from 'express';
import { getAllPlans, getPublicPlans, updatePlan } from './subscriptions.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';

const router = Router();

// Public route to fetch active plans
router.get('/public', getPublicPlans);

// Protected routes for superadmin
router.get('/', authenticate, authorize('superadmin'), getAllPlans);
router.put('/:id', authenticate, authorize('superadmin'), updatePlan);

export default router;
