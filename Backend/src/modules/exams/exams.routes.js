import { Router } from 'express';
import { 
  getExams, 
  createExam, 
  updateExam, 
  deleteExam, 
  enterMarks, 
  getExamResults,
  batchEnterMarks
} from './exams.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', catchAsync(getExams));
router.post('/', catchAsync(createExam));
router.put('/:id', catchAsync(updateExam));
router.delete('/:id', catchAsync(deleteExam));
router.post('/marks', catchAsync(enterMarks));
router.post('/batch-marks', catchAsync(batchEnterMarks));
router.get('/:id/results', catchAsync(getExamResults));

export default router;
