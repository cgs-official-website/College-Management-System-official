import { Router } from 'express';
import { authorize } from '../../middleware/authorize.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { createSlot, getSlots, deleteSlot, assignMeeting, getMeetings, updateMeeting, getPtmStudents } from './ptm.controller.js';

const router = Router();

router.use(authenticate, resolveTenant);

// Teacher availability slots
router.post('/slots', authorize('admin', 'teacher', 'hod', 'faculty'), createSlot);
router.get('/slots', authorize('admin', 'teacher', 'hod', 'faculty'), getSlots);
router.delete('/slots/:id', authorize('admin', 'teacher', 'hod', 'faculty'), deleteSlot);
router.get('/students', authorize('admin', 'teacher', 'hod', 'faculty'), getPtmStudents);

// Meetings (teacher assigns to student)
router.post('/meetings', authorize('admin', 'teacher', 'hod', 'faculty'), assignMeeting);
router.get('/meetings', getMeetings); // student, teacher, admin: filtered inside controller
router.patch('/meetings/:id', authorize('admin', 'teacher', 'hod', 'faculty'), updateMeeting);

export default router;