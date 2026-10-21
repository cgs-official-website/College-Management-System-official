import { Router } from 'express';
import { getRoutes, createRoute, updateRoute, deleteRoute } from './route.controller.js';
import { getVehicles, createVehicle, updateVehicle, deleteVehicle, bulkImportVehicles } from './vehicle.controller.js';
import { getDrivers, createDriver, updateDriver, deleteDriver } from './driver.controller.js';
import { getWaiting, getAllocations, assignStudents, unassignStudents, changeStop, getMyTransport } from './allocation.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { catchAsync } from '../../lib/catchAsync.js';
import { getTerms, createTerm, updateTerm, setCurrentTerm, generateTermFees, deleteTerm } from './term.controller.js';

const router = Router();
router.use(authenticate, resolveTenant);

// Vehicles
router.post('/vehicles/bulk', requirePermission('transport', 'create'), catchAsync(bulkImportVehicles));
router.get('/vehicles', requirePermission('transport', 'read'), catchAsync(getVehicles));
router.post('/vehicles', requirePermission('transport', 'create'), catchAsync(createVehicle));
router.put('/vehicles/:id', requirePermission('transport', 'update'), catchAsync(updateVehicle));
router.delete('/vehicles/:id', requirePermission('transport', 'delete'), catchAsync(deleteVehicle));

// Drivers
router.get('/drivers', requirePermission('transport', 'read'), catchAsync(getDrivers));
router.post('/drivers', requirePermission('transport', 'create'), catchAsync(createDriver));
router.put('/drivers/:id', requirePermission('transport', 'update'), catchAsync(updateDriver));
router.delete('/drivers/:id', requirePermission('transport', 'delete'), catchAsync(deleteDriver));

// Fee terms
router.get('/terms', requirePermission('transport', 'read'), catchAsync(getTerms));
router.post('/terms', requirePermission('transport', 'create'), catchAsync(createTerm));
router.put('/terms/:id', requirePermission('transport', 'update'), catchAsync(updateTerm));
router.post('/terms/:id/current', requirePermission('transport', 'update'), catchAsync(setCurrentTerm));
router.delete('/terms/:id', requirePermission('transport', 'delete'), catchAsync(deleteTerm));
router.post('/terms/:id/generate', requirePermission('transport', 'update'), catchAsync(generateTermFees));

// Student assignments
router.get('/allocations/waiting', requirePermission('transport', 'read'), catchAsync(getWaiting));
router.get('/allocations', requirePermission('transport', 'read'), catchAsync(getAllocations));
router.post('/allocations/assign', requirePermission('transport', 'update'), catchAsync(assignStudents));
router.post('/allocations/unassign', requirePermission('transport', 'update'), catchAsync(unassignStudents));
router.post('/allocations/change-stop', requirePermission('transport', 'update'), catchAsync(changeStop));

router.get('/', requirePermission('transport', 'read'), catchAsync(getRoutes));
router.post('/', requirePermission('transport', 'create'), catchAsync(createRoute));
router.put('/:id', requirePermission('transport', 'update'), catchAsync(updateRoute));
router.delete('/:id', requirePermission('transport', 'delete'), catchAsync(deleteRoute));
router.get('/my', catchAsync(getMyTransport));

export default router;