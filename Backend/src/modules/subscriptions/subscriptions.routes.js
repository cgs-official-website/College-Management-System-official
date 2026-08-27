import { Router } from 'express';
import { getAllPlans, getPublicPlans, updatePlan } from './subscriptions.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();

// Public route to fetch active plans
router.get('/public', getPublicPlans);

// Protected routes for superadmin
router.get('/', authenticate, getAllPlans);
router.put('/:id', authenticate, updatePlan);

export default router;
