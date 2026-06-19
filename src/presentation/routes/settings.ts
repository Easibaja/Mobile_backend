import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/authMiddleware';
import { getUserSettings, saveUserSettings } from '../../application/services/settingsService';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const settings = await getUserSettings((req as any).user.sub);
    res.json({ settings });
  } catch (error) {
    next(error);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const { units, searchRadius, themePreference, notifications, updatedAt } = req.body;
    if (
      !['km', 'mi'].includes(units) ||
      typeof searchRadius !== 'number' ||
      !['auto', 'light', 'dark'].includes(themePreference) ||
      typeof notifications !== 'boolean' ||
      typeof updatedAt !== 'string'
    ) {
      return res.status(400).json({ message: 'Invalid settings payload' });
    }

    const canonicalSettings = await saveUserSettings({
      userId: (req as any).user.sub,
      units,
      searchRadius,
      themePreference,
      notifications,
      updatedAt,
    });

    res.json({ settings: canonicalSettings });
  } catch (error) {
    next(error);
  }
});

export default router;
