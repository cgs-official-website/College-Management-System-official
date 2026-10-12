import { Router } from 'express';
import {
  getItems, createItem, updateItem, deleteItem, getHostelStudents, assignHostelRoom,
  bulkImportHostelRooms, getRooms, createRoom, updateRoom, deleteRoom, getAvailableRooms,
} from './hostel.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/students', requirePermission('hostel', 'read'), catchAsync(getHostelStudents));
router.put('/students/:id/room', requirePermission('hostel', 'update'), catchAsync(assignHostelRoom));
router.get('/available-rooms', requirePermission('hostel', 'read'), catchAsync(getAvailableRooms));
router.put('/rooms/:roomId', requirePermission('hostel', 'update'), catchAsync(updateRoom));
router.delete('/rooms/:roomId', requirePermission('hostel', 'delete'), catchAsync(deleteRoom));
router.get('/:blockId/rooms', requirePermission('hostel', 'read'), catchAsync(getRooms));
router.post('/:blockId/rooms', requirePermission('hostel', 'create'), catchAsync(createRoom));
router.get('/', requirePermission('hostel', 'read'), catchAsync(getItems));
router.post('/', requirePermission('hostel', 'create'), catchAsync(createItem));
router.post('/bulk', requirePermission('hostel', 'create'), catchAsync(bulkImportHostelRooms));
router.put('/:id', requirePermission('hostel', 'update'), catchAsync(updateItem));
router.delete('/:id', requirePermission('hostel', 'delete'), catchAsync(deleteItem));

export default router;
