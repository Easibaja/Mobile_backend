import { prisma } from '../db/prismaClient';
import type { User as UserModel } from '../../generated/prisma/client';

export type User = {
  id: string;
  provider: string;
  email?: string;
  name?: string;
  picture?: string;
  createdAt: string;
  updatedAt: string;
};

const mapToUser = (row: UserModel): User => ({
  id: row.id,
  provider: row.provider,
  email: row.email ?? undefined,
  name: row.name ?? undefined,
  picture: row.picture ?? undefined,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export class UserRepository {
  async findById(id: string): Promise<User | undefined> {
    const row = await prisma.user.findUnique({ where: { id } });
    return row ? mapToUser(row) : undefined;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const row = await prisma.user.findFirst({ where: { email } });
    return row ? mapToUser(row) : undefined;
  }

  async save(user: User): Promise<User> {
    const row = await prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        provider: user.provider,
        email: user.email ?? null,
        name: user.name ?? null,
        picture: user.picture ?? null,
        createdAt: new Date(user.createdAt),
      },
      update: {
        name: user.name ?? undefined,
        picture: user.picture ?? null,
      },
    });

    return mapToUser(row);
  }
}
