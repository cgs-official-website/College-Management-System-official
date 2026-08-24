import { Router } from 'express';
import { getLibraryItems, createLibraryItem, deleteLibraryItem, updateLibraryItem, bulkImportLibrary } from './library.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', requirePermission('library', 'read'), catchAsync(getLibraryItems));
router.post('/', requirePermission('library', 'create'), catchAsync(createLibraryItem));
router.post('/bulk', requirePermission('library', 'create'), catchAsync(bulkImportLibrary));
router.put('/:id', requirePermission('library', 'update'), catchAsync(updateLibraryItem));
router.delete('/:id', requirePermission('library', 'delete'), catchAsync(deleteLibraryItem));

export default router;
