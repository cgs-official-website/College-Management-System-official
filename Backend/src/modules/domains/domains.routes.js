import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { authorize } from '../../middleware/authorize.js';
import { catchAsync } from '../../lib/catchAsync.js';
import {
  getDomains,
  addDomain,
  verifyDomain,
  deleteDomain,
  getNonCompliantUsers,
} from './domains.controller.js';

const router = Router();

// Protect all domain routes: Require authentication, tenant scoping (collegeId), and Admin RBAC
router.use(authenticate, resolveTenant, authorize('admin'));

router.get('/', catchAsync(getDomains));
router.get('/non-compliant-users', catchAsync(getNonCompliantUsers));
router.post('/', catchAsync(addDomain));
router.post('/:id/verify', catchAsync(verifyDomain));
router.delete('/:id', catchAsync(deleteDomain));

export default router;
