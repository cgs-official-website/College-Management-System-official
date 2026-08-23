import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { authorize } from '../../middleware/authorize.js';
import { requirePermission } from '../../middleware/requirePermission.js';
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

// All role endpoints require tenant context
router.use(authenticate, resolveTenant);

router.get('/', requirePermission('roles', 'read'), catchAsync(getRoles));
router.post('/', requirePermission('roles', 'create'), catchAsync(createRole));
router.get('/:id', requirePermission('roles', 'read'), catchAsync(getRoleById));
router.put('/:id', requirePermission('roles', 'update'), catchAsync(updateRole));
router.delete('/:id', requirePermission('roles', 'delete'), catchAsync(deleteRole));
router.put('/:id/permissions', requirePermission('roles', 'update'), catchAsync(updateRolePermissions));

export default router;
