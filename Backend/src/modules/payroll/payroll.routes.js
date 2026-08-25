import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { authorize } from '../../middleware/authorize.js';
import { catchAsync } from '../../lib/catchAsync.js';
import * as controller from './payroll.controller.js';

const router = Router();

router.use(authenticate, resolveTenant);

// Admin Routes (using granular permissions per module)
router.post('/generate', requirePermission('payroll', 'create'), catchAsync(controller.generatePayroll));
router.get('/', requirePermission('payroll', 'read'), catchAsync(controller.getPayrolls));
router.patch('/:id/status', requirePermission('payroll', 'update'), catchAsync(controller.updatePayrollStatus));

// Staff Routes (viewing own payslips, just needs staff/teacher role)
router.get('/my-payslips', authorize('teacher', 'staff', 'admin', 'superadmin'), catchAsync(controller.getStaffPayslips));

export default router;
