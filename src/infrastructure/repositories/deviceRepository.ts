import { prisma } from '../db/prismaClient';
import type { DeviceRegistration as DeviceRegistrationModel } from '../../generated/prisma/client';

export type DeviceRegistration = {
  id: string;
  userId: string;
  token: string;
  platform: string;
  isActive: boolean;
  invalidatedAt?: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
};

const mapToDevice = (row: DeviceRegistrationModel): DeviceRegistration => ({
  id: row.id,
  userId: row.userId,
  token: row.token,
  platform: row.platform,
  isActive: row.isActive,
  invalidatedAt: row.invalidatedAt?.toISOString(),
  lastSeenAt: row.lastSeenAt.toISOString(),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export class DeviceRepository {
  async upsertDevice(input: { userId: string; token: string; platform: string }): Promise<DeviceRegistration> {
    const row = await prisma.deviceRegistration.upsert({
      where: {
        userId_token: {
          userId: input.userId,
          token: input.token,
        },
      },
      create: {
        userId: input.userId,
        token: input.token,
        platform: input.platform,
        isActive: true,
        invalidatedAt: null,
        lastSeenAt: new Date(),
      },
      update: {
        platform: input.platform,
        isActive: true,
        invalidatedAt: null,
        lastSeenAt: new Date(),
      },
    });

    return mapToDevice(row);
  }

  async listActiveByUserId(userId: string): Promise<DeviceRegistration[]> {
    const rows = await prisma.deviceRegistration.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return rows.map(mapToDevice);
  }

  async deactivateById(deviceId: string, reason: string): Promise<void> {
    await prisma.deviceRegistration.updateMany({
      where: { id: deviceId },
      data: {
        isActive: false,
        invalidatedAt: new Date(),
      },
    });

    console.warn(`Device ${deviceId} deactivated: ${reason}`);
  }
}
