import { Router } from 'express';
import {
  getAssignments,
  getAssignmentOptions,
  createAssignment,
  deleteAssignment,
  getAssignmentSubmissions,
  gradeSubmission
} from './assignments.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', catchAsync(getAssignments));
router.get('/options', catchAsync(getAssignmentOptions)); 
router.get('/:id/submissions', catchAsync(getAssignmentSubmissions));
router.patch('/:id/submissions/:submissionId/grade', catchAsync(gradeSubmission));
router.post('/', catchAsync(createAssignment));
router.delete('/:id', catchAsync(deleteAssignment));

export default router;