import { prisma } from '../db/prismaClient';
import type { UserSettings as UserSettingsModel } from '../../generated/prisma/client';

export type UserSettings = {
  userId: string;
  units: 'km' | 'mi';
  searchRadius: number;
  themePreference: 'auto' | 'light' | 'dark';
  notifications: boolean;
  updatedAt: string;
};

const mapToUserSettings = (row: UserSettingsModel): UserSettings => ({
  userId: row.userId,
  units: row.units as 'km' | 'mi',
  searchRadius: row.searchRadius,
  themePreference: row.themePreference as 'auto' | 'light' | 'dark',
  notifications: row.notifications,
  updatedAt: row.updatedAt.toISOString(),
});

export class SettingsRepository {
  async findByUserId(userId: string): Promise<UserSettings | undefined> {
    const row = await prisma.userSettings.findUnique({ where: { userId } });
    return row ? mapToUserSettings(row) : undefined;
  }

  async save(settings: Omit<UserSettings, 'updatedAt'>): Promise<UserSettings> {
    const row = await prisma.userSettings.upsert({
      where: { userId: settings.userId },
      create: {
        userId: settings.userId,
        units: settings.units,
        searchRadius: settings.searchRadius,
        themePreference: settings.themePreference,
        notifications: settings.notifications,
      },
      update: {
        units: settings.units,
        searchRadius: settings.searchRadius,
        themePreference: settings.themePreference,
        notifications: settings.notifications,
      },
    });
    return mapToUserSettings(row);
  }
}
