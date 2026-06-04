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
};

export type CreateFavoriteInput = Omit<Favorite, 'id' | 'createdAt'>;

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
});

export class FavoriteRepository {
  async findAllByUserId(userId: string): Promise<Favorite[]> {
    const rows = await prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapToFavorite);
  }

  async findByUserAndPlace(userId: string, placeId: string): Promise<Favorite | undefined> {
    const row = await prisma.favorite.findUnique({
      where: { userId_placeId: { userId, placeId } },
    });
    return row ? mapToFavorite(row) : undefined;
  }

  async create(input: CreateFavoriteInput): Promise<Favorite> {
    const row = await prisma.favorite.create({
      data: {
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
    });
    return mapToFavorite(row);
  }

  async delete(userId: string, placeId: string): Promise<void> {
    await prisma.favorite.deleteMany({
      where: { userId, placeId },
    });
  }
}