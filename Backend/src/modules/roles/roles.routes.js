import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { authorize } from '../../middleware/authorize.js';
import { catchAsync } from '../../lib/catchAsync.js';
import {
  getModules,
  getRoles,
  createRole,
  getRoleById,
  updateRole,
  deleteRole,
  updateRolePermissions
} from './roles.controller.js';

const router = Router();

// Module listing endpoint
router.get('/modules', authenticate, catchAsync(getModules));

// All role endpoints require admin authentication & tenant context
router.use(authenticate, resolveTenant, authorize('admin', 'superadmin'));

router.get('/', catchAsync(getRoles));
router.post('/', catchAsync(createRole));
router.get('/:id', catchAsync(getRoleById));
router.put('/:id', catchAsync(updateRole));
router.delete('/:id', catchAsync(deleteRole));
router.put('/:id/permissions', catchAsync(updateRolePermissions));

export default router;
