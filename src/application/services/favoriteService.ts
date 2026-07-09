import { FavoriteRepository, type CreateFavoriteInput, type FavoriteSyncInput } from '../../infrastructure/repositories/favoriteRepository';
import { enqueueInfrastructureNotification } from './pushNotificationService';

const repo = new FavoriteRepository();

export async function getUserFavorites(userId: string) {
  return repo.findAllByUserId(userId);
}

export async function addFavorite(input: CreateFavoriteInput) {
  const favorite = await repo.upsert({ ...input });

  await enqueueInfrastructureNotification({
    userId: input.userId,
    title: 'Favorite saved',
    body: favorite.name
      ? `${favorite.name} was added to your favorites.`
      : 'A place was added to your favorites.',
    payload: {
      event: 'favorite-added',
      placeId: favorite.placeId,
      favoriteId: favorite.id,
      favoriteName: favorite.name ?? null,
    },
  });

  return favorite;
}

export async function removeFavorite(userId: string, placeId: string) {
  const favorite = await repo.findByUserAndPlace(userId, placeId);
  await repo.softDelete(userId, placeId);

  if (favorite) {
    await enqueueInfrastructureNotification({
      userId,
      title: 'Favorite removed',
      body: favorite.name
        ? `${favorite.name} was removed from your favorites.`
        : 'A place was removed from your favorites.',
      payload: {
        event: 'favorite-removed',
        placeId,
        favoriteId: favorite.id,
        favoriteName: favorite.name ?? null,
      },
    });
  }
}

export async function syncFavorites(userId: string, favorites: FavoriteSyncInput[]) {
  return repo.syncFavorites(userId, favorites);
}