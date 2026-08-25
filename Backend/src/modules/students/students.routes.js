import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { catchAsync } from '../../lib/catchAsync.js';
import {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  bulkImportStudents,
  getRegistrationLink,
  regenerateRegistrationLink,
  toggleRegistrationLink
} from './students.controller.js';

const router = Router();

router.use(authenticate, resolveTenant);

// Registration link management for Admin
router.get('/registration-link', requirePermission('students', 'read'), catchAsync(getRegistrationLink));
router.post('/registration-link/regenerate', requirePermission('students', 'update'), catchAsync(regenerateRegistrationLink));
router.patch('/registration-link/toggle', requirePermission('students', 'update'), catchAsync(toggleRegistrationLink));

router.get('/', requirePermission('students', 'read'), catchAsync(getStudents));
router.get('/:id', requirePermission('students', 'read'), catchAsync(getStudentById));
router.post('/', requirePermission('students', 'create'), catchAsync(createStudent));
router.post('/bulk', requirePermission('students', 'create'), catchAsync(bulkImportStudents));
router.put('/:id', requirePermission('students', 'update'), catchAsync(updateStudent));
router.delete('/:id', requirePermission('students', 'delete'), catchAsync(deleteStudent));

export default router;
