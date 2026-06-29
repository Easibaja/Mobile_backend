import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/authMiddleware';
import { productById } from '../../domain/catalog';
import { createPaymentIntent } from '../../application/services/paymentService';

const router = Router();

router.use(requireAuth);

// POST /payments/intent -> { clientSecret, amountMinor, currency, productLabel }
router.post('/intent', async (req, res, next) => {
  try {
    const { placeId, placeName, productId } = req.body;
    if (!placeId || !placeName || !productId) {
      return res.status(400).json({ message: 'placeId, placeName and productId are required' });
    }

    const product = productById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Unknown productId' });
    }

    const result = await createPaymentIntent({
      userId: (req as any).user.sub,
      placeId,
      placeName,
      product,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
