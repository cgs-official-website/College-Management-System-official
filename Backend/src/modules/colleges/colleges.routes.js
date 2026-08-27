import { Router } from 'express';
import { 
  getAllColleges, 
  onboardCollege, 
  updateCollegeStatus, 
  deleteCollege, 
  getCollege, 
  updateCollege,
  getMyCollegeStatus
} from './colleges.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();

// Current User's College Status (accessible to pending/active admins)
router.get('/me/status', authenticate, getMyCollegeStatus);

router.get('/', getAllColleges);
router.post('/onboard', onboardCollege);
router.put('/:id/status', updateCollegeStatus);
router.patch('/:id/status', updateCollegeStatus);
router.delete('/:id', deleteCollege);

// Admin accessible routes
router.get('/:id', authenticate, getCollege);
router.put('/:id', authenticate, updateCollege);

export default router;
