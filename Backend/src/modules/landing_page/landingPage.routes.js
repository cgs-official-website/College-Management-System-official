import { Router } from 'express';
import { getLandingPageContent, updateLandingPageContent } from './landingPage.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';

const router = Router();

// Public route to fetch content (this will be mounted under /api/v1/public/landing-page)
router.get('/', getLandingPageContent);

// Protected route for superadmin to update content (this will be mounted under /api/v1/superadmin/landing-page)
router.put('/', authenticate, authorize('superadmin'), updateLandingPageContent);

export default router;
