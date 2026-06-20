import { prisma } from '../db/prismaClient';
import type { UserNotificationPreferences as UserNotificationPreferencesModel } from '../../generated/prisma/client';

export type UserNotificationPreferences = {
  userId: string;
  infrastructureEnabled: boolean;
  locationEnabled: boolean;
  weatherEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone: string;
  updatedAt: string;
};

export type GreetingRecipient = {
  userId: string;
  timezone: string;
};

const mapToPreferences = (row: UserNotificationPreferencesModel): UserNotificationPreferences => ({
  userId: row.userId,
  infrastructureEnabled: row.infrastructureEnabled,
  locationEnabled: row.locationEnabled,
  weatherEnabled: row.weatherEnabled,
  quietHoursStart: row.quietHoursStart ?? undefined,
  quietHoursEnd: row.quietHoursEnd ?? undefined,
  timezone: row.timezone,
  updatedAt: row.updatedAt.toISOString(),
});

export class NotificationPreferenceRepository {
  async findByUserId(userId: string): Promise<UserNotificationPreferences | undefined> {
    const row = await prisma.userNotificationPreferences.findUnique({
      where: { userId },
    });

    return row ? mapToPreferences(row) : undefined;
  }

  async listGreetingRecipients(): Promise<GreetingRecipient[]> {
    const rows = await prisma.user.findMany({
      where: {
        settings: {
          notifications: true,
        },
        notificationPreferences: {
          infrastructureEnabled: true,
        },
      },
      select: {
        id: true,
        notificationPreferences: {
          select: {
            timezone: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      userId: row.id,
      timezone: row.notificationPreferences?.timezone ?? 'UTC',
    }));
  }

  async save(input: Omit<UserNotificationPreferences, 'updatedAt'>): Promise<UserNotificationPreferences> {
    const row = await prisma.userNotificationPreferences.upsert({
      where: {
        userId: input.userId,
      },
      create: {
        userId: input.userId,
        infrastructureEnabled: input.infrastructureEnabled,
        locationEnabled: input.locationEnabled,
        weatherEnabled: input.weatherEnabled,
        quietHoursStart: input.quietHoursStart ?? null,
        quietHoursEnd: input.quietHoursEnd ?? null,
        timezone: input.timezone,
      },
      update: {
        infrastructureEnabled: input.infrastructureEnabled,
        locationEnabled: input.locationEnabled,
        weatherEnabled: input.weatherEnabled,
        quietHoursStart: input.quietHoursStart ?? null,
        quietHoursEnd: input.quietHoursEnd ?? null,
        timezone: input.timezone,
      },
    });

    return mapToPreferences(row);
  }
}
