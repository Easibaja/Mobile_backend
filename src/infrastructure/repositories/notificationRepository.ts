import { prisma } from '../db/prismaClient';
import type { NotificationDelivery as NotificationDeliveryModel, NotificationJob as NotificationJobModel } from '../../generated/prisma/client';

type JsonPayload = Record<string, unknown>;

export type NotificationCategory = 'infrastructure' | 'location' | 'weather';

export type NotificationDelivery = {
  id: string;
  userId: string;
  deviceId?: string;
  category: NotificationCategory;
  title: string;
  body: string;
  payload?: JsonPayload;
  status: string;
  providerMessageId?: string;
  failureReason?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type NotificationJob = {
  id: string;
  userId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  payload?: JsonPayload;
  status: string;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string;
  lastError?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
};

const mapDelivery = (row: NotificationDeliveryModel): NotificationDelivery => ({
  id: row.id,
  userId: row.userId,
  deviceId: row.deviceId ?? undefined,
  category: row.category as NotificationCategory,
  title: row.title,
  body: row.body,
  payload: (row.payload as JsonPayload | null) ?? undefined,
  status: row.status,
  providerMessageId: row.providerMessageId ?? undefined,
  failureReason: row.failureReason ?? undefined,
  sentAt: row.sentAt?.toISOString(),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const mapJob = (row: NotificationJobModel): NotificationJob => ({
  id: row.id,
  userId: row.userId,
  category: row.category as NotificationCategory,
  title: row.title,
  body: row.body,
  payload: (row.payload as JsonPayload | null) ?? undefined,
  status: row.status,
  attempts: row.attempts,
  maxAttempts: row.maxAttempts,
  nextAttemptAt: row.nextAttemptAt.toISOString(),
  lastError: row.lastError ?? undefined,
  processedAt: row.processedAt?.toISOString(),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export class NotificationRepository {
  private toJsonPayload(payload?: JsonPayload) {
    return payload as unknown as import('../../generated/prisma/client').Prisma.InputJsonValue | undefined;
  }

  async enqueueJob(input: {
    userId: string;
    category: NotificationCategory;
    title: string;
    body: string;
    payload?: JsonPayload;
    maxAttempts?: number;
  }): Promise<NotificationJob> {
    const row = await prisma.notificationJob.create({
      data: {
        userId: input.userId,
        category: input.category,
        title: input.title,
        body: input.body,
        payload: this.toJsonPayload(input.payload),
        status: 'queued',
        maxAttempts: input.maxAttempts ?? 5,
        nextAttemptAt: new Date(),
      },
    });

    return mapJob(row);
  }

  async claimNextJob(): Promise<NotificationJob | undefined> {
    const now = new Date();

    const nextJob = await prisma.notificationJob.findFirst({
      where: {
        status: {
          in: ['queued', 'retrying'],
        },
        nextAttemptAt: {
          lte: now,
        },
      },
      orderBy: [{ nextAttemptAt: 'asc' }, { createdAt: 'asc' }],
    });

    if (!nextJob) {
      return undefined;
    }

    const lock = await prisma.notificationJob.updateMany({
      where: {
        id: nextJob.id,
        status: {
          in: ['queued', 'retrying'],
        },
      },
      data: {
        status: 'processing',
      },
    });

    if (lock.count === 0) {
      return undefined;
    }

    const claimed = await prisma.notificationJob.findUnique({
      where: {
        id: nextJob.id,
      },
    });

    return claimed ? mapJob(claimed) : undefined;
  }

  async markJobCompleted(jobId: string): Promise<void> {
    await prisma.notificationJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        processedAt: new Date(),
        lastError: null,
      },
    });
  }

  async markJobRetriable(job: NotificationJob, errorMessage: string): Promise<void> {
    const attempts = job.attempts + 1;
    const exhausted = attempts >= job.maxAttempts;
    const retryDelaySeconds = Math.min(2 ** attempts * 5, 300);

    await prisma.notificationJob.update({
      where: { id: job.id },
      data: {
        attempts,
        status: exhausted ? 'failed' : 'retrying',
        lastError: errorMessage,
        nextAttemptAt: exhausted ? new Date() : new Date(Date.now() + retryDelaySeconds * 1000),
        processedAt: exhausted ? new Date() : null,
      },
    });
  }

  async createDelivery(input: {
    userId: string;
    deviceId?: string;
    category: NotificationCategory;
    title: string;
    body: string;
    payload?: JsonPayload;
    status: string;
    providerMessageId?: string;
    failureReason?: string;
  }): Promise<NotificationDelivery> {
    const row = await prisma.notificationDelivery.create({
      data: {
        userId: input.userId,
        deviceId: input.deviceId,
        category: input.category,
        title: input.title,
        body: input.body,
        payload: this.toJsonPayload(input.payload),
        status: input.status,
        providerMessageId: input.providerMessageId,
        failureReason: input.failureReason,
        sentAt: input.status === 'sent' ? new Date() : null,
      },
    });

    return mapDelivery(row);
  }

  async listDeliveriesByUserId(userId: string, limit = 20): Promise<NotificationDelivery[]> {
    const rows = await prisma.notificationDelivery.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return rows.map(mapDelivery);
  }
}
