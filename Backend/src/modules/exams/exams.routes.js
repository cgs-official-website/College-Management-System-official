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
import { authorize } from '../../middleware/authorize.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

router.use(authenticate, resolveTenant);

// Only staff roles can use the exams/marks APIs (students use the student portal routes)
const staffOnly = authorize('admin', 'superadmin', 'teacher', 'hod', 'faculty');

router.get('/', staffOnly, catchAsync(getExams));
router.post('/', staffOnly, catchAsync(createExam));
router.put('/:id', staffOnly, catchAsync(updateExam));
router.delete('/:id', staffOnly, catchAsync(deleteExam));
router.post('/marks', staffOnly, catchAsync(enterMarks));
router.post('/batch-marks', staffOnly, catchAsync(batchEnterMarks));
router.get('/:id/results', staffOnly, catchAsync(getExamResults));

export default router;