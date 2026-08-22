import { Router } from 'express';
import { 
  getAssignments, 
  createAssignment, 
  deleteAssignment 
} from './assignments.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', catchAsync(getAssignments));
router.post('/', catchAsync(createAssignment));
router.delete('/:id', catchAsync(deleteAssignment));

export default router;
