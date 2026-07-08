import {
  NotificationPreferenceRepository,
  type UserNotificationPreferences,
} from '../../infrastructure/repositories/notificationPreferenceRepository';

const repo = new NotificationPreferenceRepository();

const DEFAULT_PREFERENCES: Omit<UserNotificationPreferences, 'userId' | 'updatedAt'> = {
  infrastructureEnabled: true,
  locationEnabled: true,
  weatherEnabled: true,
  quietHoursStart: undefined,
  quietHoursEnd: undefined,
  timezone: 'UTC',
};

export type NotificationPreferenceInput = {
  infrastructureEnabled: boolean;
  locationEnabled: boolean;
  weatherEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone: string;
};

function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function normalizeQuietHours(input: NotificationPreferenceInput): NotificationPreferenceInput {
  const hasStart = typeof input.quietHoursStart === 'string' && input.quietHoursStart.length > 0;
  const hasEnd = typeof input.quietHoursEnd === 'string' && input.quietHoursEnd.length > 0;

  if (!hasStart && !hasEnd) {
    return {
      ...input,
      quietHoursStart: undefined,
      quietHoursEnd: undefined,
    };
  }

  if (!hasStart || !hasEnd) {
    const err = new Error('quietHoursStart and quietHoursEnd are both required when configuring quiet hours') as Error & {
      status: number;
    };
    err.status = 400;
    throw err;
  }

  if (!isValidTime(input.quietHoursStart as string) || !isValidTime(input.quietHoursEnd as string)) {
    const err = new Error('quiet hours must use HH:mm format') as Error & { status: number };
    err.status = 400;
    throw err;
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: input.timezone });
  } catch {
    const err = new Error('timezone is invalid') as Error & { status: number };
    err.status = 400;
    throw err;
  }

  return input;
}

export async function getNotificationPreferences(userId: string): Promise<UserNotificationPreferences> {
  const existing = await repo.findByUserId(userId);
  if (existing) {
    return existing;
  }

  return repo.save({
    userId,
    ...DEFAULT_PREFERENCES,
  });
}

export async function saveNotificationPreferences(
  userId: string,
  input: NotificationPreferenceInput
): Promise<UserNotificationPreferences> {
  const normalized = normalizeQuietHours(input);

  return repo.save({
    userId,
    infrastructureEnabled: normalized.infrastructureEnabled,
    locationEnabled: normalized.locationEnabled,
    weatherEnabled: normalized.weatherEnabled,
    quietHoursStart: normalized.quietHoursStart,
    quietHoursEnd: normalized.quietHoursEnd,
    timezone: normalized.timezone,
  });
}
