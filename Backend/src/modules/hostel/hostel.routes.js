import { Router } from 'express';
import { getItems, createItem, deleteItem, getHostelStudents, assignHostelRoom, bulkImportHostelRooms } from './hostel.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/students', requirePermission('hostel', 'read'), catchAsync(getHostelStudents));
router.put('/students/:id/room', requirePermission('hostel', 'update'), catchAsync(assignHostelRoom));
router.get('/', requirePermission('hostel', 'read'), catchAsync(getItems));
router.post('/', requirePermission('hostel', 'create'), catchAsync(createItem));
router.post('/bulk', requirePermission('hostel', 'create'), catchAsync(bulkImportHostelRooms));
router.delete('/:id', requirePermission('hostel', 'delete'), catchAsync(deleteItem));

export default router;
