import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/authMiddleware';
import { confirmTicket } from '../../application/services/ticketService';

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

export default router;
