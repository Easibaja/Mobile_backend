import { FavoriteRepository, type CreateFavoriteInput } from '../../infrastructure/repositories/favoriteRepository';

const repo = new FavoriteRepository();

export async function getUserFavorites(userId: string) {
  return repo.findAllByUserId(userId);
}

export async function addFavorite(input: CreateFavoriteInput) {
  const existing = await repo.findByUserAndPlace(input.userId, input.placeId);
  if (existing) return existing;
  return repo.create(input);
}

export async function removeFavorite(userId: string, placeId: string) {
  await repo.delete(userId, placeId);
}