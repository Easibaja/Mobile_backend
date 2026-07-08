import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/authMiddleware';
import { confirmTicket, getUserTickets } from '../../application/services/ticketService';

const router = Router();

router.use(requireAuth);

// POST /tickets/confirm -> { ticket }
router.post('/confirm', async (req, res, next) => {
  try {
    const { paymentIntentId } = req.body;
    if (!paymentIntentId) {
      return res.status(400).json({ message: 'paymentIntentId is required' });
    }
    const ticket = await confirmTicket((req as any).user.sub, paymentIntentId);
    res.json({ ticket });
  } catch (error) {
    next(error);
  }
});

// GET /tickets -> { tickets } (current user, newest first)
router.get('/', async (req, res, next) => {
  try {
    const tickets = await getUserTickets((req as any).user.sub);
    res.json({ tickets });
  } catch (error) {
    next(error);
  }
});

export default router;
