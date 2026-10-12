import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { catchAsync } from '../../lib/catchAsync.js';
import {
  getAuditLogsController,
  getAuditLogByIdController,
  createAuditLogController,
  immutableBlockController
} from './audit.controller.js';

const router = Router();

// Resilient tenant context binder: strictly confines non-superadmin users to their authenticated collegeId
const resolveAuditTenant = (req, res, next) => {
  if (req.user) {
    const isSuperAdmin = (req.user.role || '').toLowerCase() === 'superadmin';
    let collegeId = req.user?.collegeId;
    if (isSuperAdmin) {
      collegeId = req.headers?.['x-college-id'] || req.query?.collegeId || req.user?.collegeId || null;
    }
    req.tenant = { collegeId: collegeId || null };
  }
  next();
};

// Enforce authentication on all audit endpoints with resilient tenant handling
router.use(authenticate, resolveAuditTenant);

// Strict immutability middleware: reject any PUT, DELETE, or PATCH mutations
router.use((req, res, next) => {
  if (['PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return immutableBlockController(req, res);
  }
  next();
});

// Read-only retrieval endpoints
router.get('/', catchAsync(getAuditLogsController));
router.get('/:id', catchAsync(getAuditLogByIdController));

// Programmatic / client log recording
router.post('/', catchAsync(createAuditLogController));

// Explicit route endpoints for PUT, DELETE, PATCH to return 405 Method Not Allowed cleanly
router.put('/', immutableBlockController);
router.put('/:id', immutableBlockController);
router.delete('/', immutableBlockController);
router.delete('/:id', immutableBlockController);
router.patch('/', immutableBlockController);
router.patch('/:id', immutableBlockController);

export default router;
