import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/authMiddleware';
import { getUserFavorites, addFavorite, removeFavorite, syncFavorites } from '../../application/services/favoriteService';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const favorites = await getUserFavorites((req as any).user.sub);
    res.json({ favorites });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { placeId, name, address, lat, lng, types, rating, photoName } = req.body;
    if (!placeId) return res.status(400).json({ message: 'placeId is required' });
    const favorite = await addFavorite({
      userId: (req as any).user.sub,
      placeId,
      name,
      address,
      lat,
      lng,
      types: types ?? [],
      rating,
      photoName,
    });
    res.status(201).json({ favorite });
  } catch (error) {
    next(error);
  }
});

router.delete('/:placeId', async (req, res, next) => {
  try {
    await removeFavorite((req as any).user.sub, req.params.placeId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post('/sync', async (req, res, next) => {
  try {
    const favorites = Array.isArray(req.body.favorites) ? req.body.favorites : [];
    const syncedFavorites = await syncFavorites((req as any).user.sub, favorites);
    res.json({ favorites: syncedFavorites });
  } catch (error) {
    next(error);
  }
});

export default router;