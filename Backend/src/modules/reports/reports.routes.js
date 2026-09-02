import { Router } from 'express';
import attendanceRoutes from './attendance.routes.js';

const router = Router();

router.use('/attendance', attendanceRoutes);

export default router;
