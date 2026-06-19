import { SettingsRepository, type UserSettings } from '../../infrastructure/repositories/settingsRepository';

const repo = new SettingsRepository();

export async function getUserSettings(userId: string) {
  return repo.findByUserId(userId);
}

export async function saveUserSettings(settings: Omit<UserSettings, 'updatedAt'> & { updatedAt: string }) {
  const existing = await repo.findByUserId(settings.userId);
  if (!existing) {
    return repo.save({
      userId: settings.userId,
      units: settings.units,
      searchRadius: settings.searchRadius,
      themePreference: settings.themePreference,
      notifications: settings.notifications,
    });
  }

  const incomingUpdatedAt = new Date(settings.updatedAt);
  const currentUpdatedAt = new Date(existing.updatedAt);

  if (incomingUpdatedAt > currentUpdatedAt) {
    return repo.save({
      userId: settings.userId,
      units: settings.units,
      searchRadius: settings.searchRadius,
      themePreference: settings.themePreference,
      notifications: settings.notifications,
    });
  }

  return existing;
}
