import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/authMiddleware';
import {
  enqueueTestNotification,
  listNotificationDeliveries,
  registerPushDevice,
} from '../../application/services/pushNotificationService';
import {
  getNotificationPreferences,
  saveNotificationPreferences,
} from '../../application/services/notificationPreferenceService';

const router = Router();

router.use(requireAuth);

router.post('/devices', async (req, res, next) => {
  try {
    const { token, platform } = req.body;

    if (typeof token !== 'string' || token.length === 0) {
      return res.status(400).json({ message: 'token is required' });
    }

    const device = await registerPushDevice({
      userId: (req as any).user.sub,
      token,
      platform: typeof platform === 'string' ? platform : undefined,
    });

    res.status(201).json({ device });
  } catch (error) {
    next(error);
  }
});

router.get('/preferences', async (req, res, next) => {
  try {
    const preferences = await getNotificationPreferences((req as any).user.sub);
    res.json({ preferences });
  } catch (error) {
    next(error);
  }
});

router.put('/preferences', async (req, res, next) => {
  try {
    const {
      infrastructureEnabled,
      locationEnabled,
      weatherEnabled,
      quietHoursStart,
      quietHoursEnd,
      timezone,
    } = req.body;

    if (
      typeof infrastructureEnabled !== 'boolean' ||
      typeof locationEnabled !== 'boolean' ||
      typeof weatherEnabled !== 'boolean' ||
      typeof timezone !== 'string' ||
      (quietHoursStart !== undefined && typeof quietHoursStart !== 'string') ||
      (quietHoursEnd !== undefined && typeof quietHoursEnd !== 'string')
    ) {
      return res.status(400).json({ message: 'Invalid notification preferences payload' });
    }

    const preferences = await saveNotificationPreferences((req as any).user.sub, {
      infrastructureEnabled,
      locationEnabled,
      weatherEnabled,
      quietHoursStart,
      quietHoursEnd,
      timezone,
    });

    res.json({ preferences });
  } catch (error) {
    next(error);
  }
});

router.post('/test', async (req, res, next) => {
  try {
    const { title, body, category } = req.body ?? {};

    if (category && !['infrastructure', 'location', 'weather'].includes(category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    const job = await enqueueTestNotification((req as any).user.sub, {
      title: typeof title === 'string' ? title : undefined,
      body: typeof body === 'string' ? body : undefined,
      category,
    });

    res.status(202).json({ job });
  } catch (error) {
    next(error);
  }
});

router.get('/deliveries', async (req, res, next) => {
  try {
    const rawLimit = req.query.limit;
    const limit = typeof rawLimit === 'string' ? Number(rawLimit) : 20;
    const boundedLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 20;

    const deliveries = await listNotificationDeliveries((req as any).user.sub, boundedLimit);
    res.json({ deliveries });
  } catch (error) {
    next(error);
  }
});

export default router;
