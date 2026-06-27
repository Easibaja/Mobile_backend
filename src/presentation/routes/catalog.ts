import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/authMiddleware';
import { productsForTypes } from '../../domain/catalog';

const router = Router();

router.use(requireAuth);

// GET /catalog?types=national_park,park -> { products: TicketProduct[] }
// Empty or unmatched types yield { products: [] }.
router.get('/', (req, res) => {
  const typesParam = typeof req.query.types === 'string' ? req.query.types : '';
  const types = typesParam
    .split(',')
    .map((type) => type.trim())
    .filter((type) => type.length > 0);

  res.json({ products: productsForTypes(types) });
});

export default router;
