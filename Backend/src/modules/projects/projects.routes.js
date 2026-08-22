import express from 'express';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { authenticate } from '../../middleware/authenticate.js';
import { getProjects, getTimesheets, logTimesheet } from './projects.controller.js';

const router = express.Router();

router.use(authenticate, resolveTenant);

router.get('/', getProjects);
router.get('/timesheets', getTimesheets);
router.post('/timesheets', logTimesheet);

export default router;
