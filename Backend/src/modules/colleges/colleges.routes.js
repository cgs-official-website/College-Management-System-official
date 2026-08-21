import { Router } from 'express';
import { getAllColleges, onboardCollege, updateCollegeStatus, deleteCollege } from './colleges.controller.js';

const router = Router();

router.get('/', getAllColleges);
router.post('/onboard', onboardCollege);
router.put('/:id/status', updateCollegeStatus);
router.delete('/:id', deleteCollege);

export default router;
