import { Router } from 'express';
import { 
  getAllColleges, 
  getCollegeBySlug,
  getCollegeRegistrationContext,
  getCollegePublicCourses,
  onboardCollege, 
  updateCollegeStatus, 
  deleteCollege, 
  getCollege, 
  updateCollege,
  getMyCollegeStatus,
  updateCollegeSubscription
} from './colleges.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';

const router = Router();

const superadminOnly = authorize('superadmin');
const adminOrSuperadmin = authorize('admin', 'superadmin');

// Current User's College Status (accessible to pending/active admins)
router.get('/me/status', authenticate, getMyCollegeStatus);

// Public routes for onboarding and student/visitor registration
router.get('/slug/:slug', getCollegeBySlug);
router.get('/registration-context/:identifier', getCollegeRegistrationContext);
router.get('/registration-context/:identifier/courses', getCollegePublicCourses);
router.post('/onboard', onboardCollege);

// Superadmin only routes
router.get('/', authenticate, superadminOnly, getAllColleges);
router.put('/:id/status', authenticate, superadminOnly, updateCollegeStatus);
router.patch('/:id/status', authenticate, superadminOnly, updateCollegeStatus);
router.put('/:id/subscription', authenticate, superadminOnly, updateCollegeSubscription);
router.delete('/:id', authenticate, superadminOnly, deleteCollege);

// Admin & Superadmin accessible routes
router.get('/:id', authenticate, adminOrSuperadmin, getCollege);
router.put('/:id', authenticate, adminOrSuperadmin, updateCollege);

export default router;
