import { prisma } from '../db/prismaClient';
import type { Favorite as FavoriteModel } from '../../generated/prisma/client';

export type Favorite = {
  id: string;
  userId: string;
  placeId: string;
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
  types: string[];
  rating?: number;
  photoName?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type CreateFavoriteInput = Omit<Favorite, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

export type FavoriteSyncInput = Omit<Favorite, 'id' | 'createdAt'>;

const mapToFavorite = (row: FavoriteModel): Favorite => ({
  id: row.id,
  userId: row.userId,
  placeId: row.placeId,
  name: row.name ?? undefined,
  address: row.address ?? undefined,
  lat: row.lat ?? undefined,
  lng: row.lng ?? undefined,
  types: row.types,
  rating: row.rating ?? undefined,
  photoName: row.photoName ?? undefined,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  deletedAt: row.deletedAt?.toISOString() ?? undefined,
});

export class FavoriteRepository {
  async findAllByUserId(userId: string): Promise<Favorite[]> {
    const rows = await prisma.favorite.findMany({
      where: { userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map(mapToFavorite);
  }

  async findByUserAndPlace(userId: string, placeId: string): Promise<Favorite | undefined> {
    const row = await prisma.favorite.findUnique({
      where: { userId_placeId: { userId, placeId } },
    });
    return row ? mapToFavorite(row) : undefined;
  }

  async upsert(input: CreateFavoriteInput): Promise<Favorite> {
    const row = await prisma.favorite.upsert({
      where: { userId_placeId: { userId: input.userId, placeId: input.placeId } },
      create: {
        userId: input.userId,
        placeId: input.placeId,
        name: input.name ?? null,
        address: input.address ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        types: input.types,
        rating: input.rating ?? null,
        photoName: input.photoName ?? null,
      },
      update: {
        name: input.name ?? null,
        address: input.address ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        types: input.types,
        rating: input.rating ?? null,
        photoName: input.photoName ?? null,
        deletedAt: null,
      },
    });
    return mapToFavorite(row);
  }

  async softDelete(userId: string, placeId: string): Promise<void> {
    await prisma.favorite.updateMany({
      where: { userId, placeId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  async syncFavorites(userId: string, favorites: FavoriteSyncInput[]): Promise<Favorite[]> {
    const existingRows = await prisma.favorite.findMany({ where: { userId } });
    const existingMap = new Map(existingRows.map((row) => [row.placeId, row]));
    const processedPlaceIds = new Set<string>();

    const upsertPromises = favorites.map(async (favorite) => {
      processedPlaceIds.add(favorite.placeId);
      const existing = existingMap.get(favorite.placeId);
      const incomingUpdatedAt = new Date(favorite.updatedAt);

      if (!existing) {
        if (favorite.deletedAt) {
          return undefined;
        }
        return prisma.favorite.create({
          data: {
            userId: favorite.userId,
            placeId: favorite.placeId,
            name: favorite.name ?? null,
            address: favorite.address ?? null,
            lat: favorite.lat ?? null,
            lng: favorite.lng ?? null,
            types: favorite.types,
            rating: favorite.rating ?? null,
            photoName: favorite.photoName ?? null,
          },
        });
      }

      const currentUpdatedAt = existing.updatedAt;
      if (incomingUpdatedAt <= currentUpdatedAt) {
        return undefined;
      }

      if (favorite.deletedAt) {
        return prisma.favorite.update({
          where: { userId_placeId: { userId, placeId: favorite.placeId } },
          data: { deletedAt: new Date(favorite.deletedAt) },
        });
      }

      return prisma.favorite.update({
        where: { userId_placeId: { userId, placeId: favorite.placeId } },
        data: {
          name: favorite.name ?? null,
          address: favorite.address ?? null,
          lat: favorite.lat ?? null,
          lng: favorite.lng ?? null,
          types: favorite.types,
          rating: favorite.rating ?? null,
          photoName: favorite.photoName ?? null,
          deletedAt: null,
        },
      });
    });

    await Promise.all(upsertPromises);

    const merged = await prisma.favorite.findMany({
      where: { userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });

    return merged.map(mapToFavorite);
  }
}