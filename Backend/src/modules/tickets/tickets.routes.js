import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { catchAsync } from '../../lib/catchAsync.js';
import {
  getTickets,
  createTicket,
  updateTicketStatus,
  replyTicket
} from './tickets.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', catchAsync(getTickets));
router.post('/', catchAsync(createTicket));
router.put('/:id/status', catchAsync(updateTicketStatus));
router.post('/:id/reply', catchAsync(replyTicket));

export default router;
