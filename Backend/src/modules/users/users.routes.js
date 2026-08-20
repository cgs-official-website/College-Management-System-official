import { Router } from 'express';
import { updateProfile } from './users.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();

router.use(authenticate);

router.put('/profile', updateProfile);

export default router;
