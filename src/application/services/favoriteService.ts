import { FavoriteRepository, type CreateFavoriteInput, type FavoriteSyncInput } from '../../infrastructure/repositories/favoriteRepository';

const repo = new FavoriteRepository();

export async function getUserFavorites(userId: string) {
  return repo.findAllByUserId(userId);
}

export async function addFavorite(input: CreateFavoriteInput) {
  return repo.upsert({ ...input });
}

export async function removeFavorite(userId: string, placeId: string) {
  await repo.softDelete(userId, placeId);
}

export async function syncFavorites(userId: string, favorites: FavoriteSyncInput[]) {
  return repo.syncFavorites(userId, favorites);
}