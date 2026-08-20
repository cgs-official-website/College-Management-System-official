import { Router } from 'express';
import { login, registerAdmin, getMe } from './auth.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();

router.post('/login', login);
router.post('/register', registerAdmin);
router.get('/me', authenticate, getMe);

export default router;
