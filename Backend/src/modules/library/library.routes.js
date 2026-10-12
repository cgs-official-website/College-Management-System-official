import { Router } from 'express';
import { getLibraryItems, createLibraryItem, deleteLibraryItem, updateLibraryItem, bulkImportLibrary } from './library.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { catchAsync } from '../../lib/catchAsync.js';
import {
  issueBook, returnBook, renewBook, listTransactions,
  getStudentSummary, getLibrarySettings, updateLibrarySettings, searchStudents,
} from './library.circulation.controller.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', requirePermission('library', 'read'), catchAsync(getLibraryItems));
router.post('/', requirePermission('library', 'create'), catchAsync(createLibraryItem));
router.post('/bulk', requirePermission('library', 'create'), catchAsync(bulkImportLibrary));
router.post('/issue', requirePermission('library', 'create'), catchAsync(issueBook));
router.post('/return/:id', requirePermission('library', 'update'), catchAsync(returnBook));
router.post('/renew/:id', requirePermission('library', 'update'), catchAsync(renewBook));
router.get('/transactions', requirePermission('library', 'read'), catchAsync(listTransactions));
router.get('/students/search', requirePermission('library', 'read'), catchAsync(searchStudents));
router.get('/students/:studentId/summary', requirePermission('library', 'read'), catchAsync(getStudentSummary));
router.get('/settings', requirePermission('library', 'read'), catchAsync(getLibrarySettings));
router.put('/settings', requirePermission('library', 'update'), catchAsync(updateLibrarySettings));

router.put('/:id', requirePermission('library', 'update'), catchAsync(updateLibraryItem));
router.delete('/:id', requirePermission('library', 'delete'), catchAsync(deleteLibraryItem));
export default router;
