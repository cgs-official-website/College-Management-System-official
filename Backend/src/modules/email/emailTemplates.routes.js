import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { catchAsync } from '../../lib/catchAsync.js';
import * as controller from './emailTemplates.controller.js';

const router = Router();

// Only superadmins should manage global email templates for now
router.use(authenticate);
router.use(authorize('superadmin'));

router.get('/', catchAsync(controller.getTemplates));
router.post('/', catchAsync(controller.createTemplate));
router.put('/:id', catchAsync(controller.updateTemplate));
router.delete('/:id', catchAsync(controller.deleteTemplate));

export default router;
