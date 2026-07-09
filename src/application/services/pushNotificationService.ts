import { DeviceRepository } from '../../infrastructure/repositories/deviceRepository';
import {
  NotificationRepository,
  type NotificationCategory,
  type NotificationJob,
} from '../../infrastructure/repositories/notificationRepository';
import { NotificationPreferenceRepository } from '../../infrastructure/repositories/notificationPreferenceRepository';
import { ExpoPushService } from '../../infrastructure/external-services/expoPushService';
import { prisma } from '../../infrastructure/db/prismaClient';

const deviceRepo = new DeviceRepository();
const notificationRepo = new NotificationRepository();
const preferenceRepo = new NotificationPreferenceRepository();
const expoPushService = new ExpoPushService();

type TestNotificationInput = {
  title?: string;
  body?: string;
  category?: NotificationCategory;
};

type InfrastructureNotificationInput = {
  userId: string;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
};

function categoryEnabled(
  category: NotificationCategory,
  preferences: {
    infrastructureEnabled: boolean;
    locationEnabled: boolean;
    weatherEnabled: boolean;
  }
): boolean {
  if (category === 'infrastructure') {
    return preferences.infrastructureEnabled;
  }
  if (category === 'location') {
    return preferences.locationEnabled;
  }
  return preferences.weatherEnabled;
}

function parseHm(hm: string): number {
  const [h, m] = hm.split(':').map((part) => Number(part));
  return h * 60 + m;
}

function getLocalMinutes(now: Date, timezone: string): number {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
  } catch {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
  }

  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');

  return hour * 60 + minute;
}

function inQuietHours(now: Date, timezone: string, start?: string, end?: string): boolean {
  if (!start || !end) {
    return false;
  }

  const localMinutes = getLocalMinutes(now, timezone);
  const startMinutes = parseHm(start);
  const endMinutes = parseHm(end);

  if (startMinutes === endMinutes) {
    return false;
  }

  if (startMinutes < endMinutes) {
    return localMinutes >= startMinutes && localMinutes < endMinutes;
  }

  return localMinutes >= startMinutes || localMinutes < endMinutes;
}

function httpError(message: string, status: number): Error {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

export async function registerPushDevice(input: {
  userId: string;
  token: string;
  platform?: string;
}) {
  if (!/^ExponentPushToken\[[^\]]+\]$/.test(input.token)) {
    throw httpError('Invalid Expo push token format', 400);
  }

  const platform = input.platform && input.platform.length > 0 ? input.platform : 'unknown';

  return deviceRepo.upsertDevice({
    userId: input.userId,
    token: input.token,
    platform,
  });
}

export async function enqueueTestNotification(userId: string, input: TestNotificationInput) {
  const category = input.category ?? 'infrastructure';

  return notificationRepo.enqueueJob({
    userId,
    category,
    title: input.title ?? 'Test notification',
    body: input.body ?? 'Push delivery pipeline is working.',
    payload: {
      source: 'notifications-test-endpoint',
      createdAt: new Date().toISOString(),
    },
  });
}

export async function enqueueInfrastructureNotification(input: InfrastructureNotificationInput) {
  return notificationRepo.enqueueJob({
    userId: input.userId,
    category: 'infrastructure',
    title: input.title,
    body: input.body,
    payload: {
      source: 'favorite-event',
      ...(input.payload ?? {}),
    },
  });
}

export async function listNotificationDeliveries(userId: string, limit = 20) {
  return notificationRepo.listDeliveriesByUserId(userId, limit);
}

export async function processNotificationJob(job: NotificationJob): Promise<void> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId: job.userId },
    select: { notifications: true },
  });

  if (settings && !settings.notifications) {
    await notificationRepo.markJobCompleted(job.id);
    return;
  }

  const preferences = await preferenceRepo.findByUserId(job.userId);

  if (preferences) {
    if (!categoryEnabled(job.category, preferences)) {
      await notificationRepo.markJobCompleted(job.id);
      return;
    }

    if (inQuietHours(new Date(), preferences.timezone, preferences.quietHoursStart, preferences.quietHoursEnd)) {
      await notificationRepo.markJobCompleted(job.id);
      return;
    }
  }

  const devices = await deviceRepo.listActiveByUserId(job.userId);

  if (devices.length === 0) {
    await notificationRepo.markJobCompleted(job.id);
    return;
  }

  let sentCount = 0;

  for (const device of devices) {
    try {
      const result = await expoPushService.send({
        token: device.token,
        title: job.title,
        body: job.body,
        data: {
          category: job.category,
          ...(job.payload ?? {}),
        },
      });

      if (result.ok) {
        sentCount += 1;
        await notificationRepo.createDelivery({
          userId: job.userId,
          deviceId: device.id,
          category: job.category,
          title: job.title,
          body: job.body,
          payload: job.payload,
          status: 'sent',
          providerMessageId: result.id,
        });
        continue;
      }

      const failureReason = result.error ?? 'Unknown push delivery failure';
      await notificationRepo.createDelivery({
        userId: job.userId,
        deviceId: device.id,
        category: job.category,
        title: job.title,
        body: job.body,
        payload: job.payload,
        status: 'failed',
        failureReason,
      });

      if (failureReason.includes('DeviceNotRegistered') || failureReason.includes('InvalidExpoPushToken')) {
        await deviceRepo.deactivateById(device.id, failureReason);
      }
    } catch (error) {
      const failureReason = error instanceof Error ? error.message : 'Unexpected push error';
      await notificationRepo.createDelivery({
        userId: job.userId,
        deviceId: device.id,
        category: job.category,
        title: job.title,
        body: job.body,
        payload: job.payload,
        status: 'failed',
        failureReason,
      });
    }
  }

  if (sentCount > 0) {
    await notificationRepo.markJobCompleted(job.id);
    return;
  }

  await notificationRepo.markJobRetriable(job, 'No devices accepted notification');
}