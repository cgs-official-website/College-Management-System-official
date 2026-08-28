import { Router } from 'express';
import { getAllColleges, onboardCollege, updateCollegeStatus, deleteCollege, getCollege, updateCollege, updateCollegeSubscription } from './colleges.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();

router.get('/', getAllColleges);
router.post('/onboard', onboardCollege);
router.put('/:id/status', updateCollegeStatus);
router.put('/:id/subscription', updateCollegeSubscription);
router.delete('/:id', deleteCollege);

// Admin accessible routes
router.get('/:id', authenticate, getCollege);
router.put('/:id', authenticate, updateCollege);

export default router;
