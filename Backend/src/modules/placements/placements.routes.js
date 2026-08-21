import express from 'express';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { authenticate } from '../../middleware/authenticate.js';
import { getItems, createItem, deleteItem } from './placements.controller.js';

const router = express.Router();

router.use(authenticate, resolveTenant);

router.get('/', getItems);
router.post('/', createItem);
router.delete('/:id', deleteItem);

export default router;
