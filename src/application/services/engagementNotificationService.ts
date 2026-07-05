import { prisma } from '../../infrastructure/db/prismaClient';
import { NotificationRepository } from '../../infrastructure/repositories/notificationRepository';

const notificationRepo = new NotificationRepository();

const INACTIVITY_DAYS = 3;
const CADENCE_DAYS = 3;
const TARGET_LOCAL_HOUR = 18;
const WINDOW_HOURS = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

type Template = {
  title: string;
  body: string;
};

const REENGAGEMENT_TEMPLATES: Template[] = [
  {
    title: 'Your saved places are waiting',
    body: 'Open Mae and pick one favorite place to visit this week.',
  },
  {
    title: 'Quick idea for tonight',
    body: 'Check nearby places around your favorites and choose one in under a minute.',
  },
  {
    title: 'Discover one new spot',
    body: 'Use your saved places as a starting point and find something new nearby.',
  },
];

function getLocalMinutes(now: Date, timezone: string): number {
  let parts: Intl.DateTimeFormatPart[];

  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
  } catch {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
  }

  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');

  return hour * 60 + minute;
}

function shouldSendInWindow(now: Date, timezone: string): boolean {
  const localMinutes = getLocalMinutes(now, timezone);
  const start = TARGET_LOCAL_HOUR * 60;
  const end = (TARGET_LOCAL_HOUR + WINDOW_HOURS) * 60;
  return localMinutes >= start && localMinutes < end;
}

function toDayKey(now: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } catch {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  }
}

function pickTemplate(userId: string): Template {
  const seed = [...userId].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return REENGAGEMENT_TEMPLATES[seed % REENGAGEMENT_TEMPLATES.length];
}

async function hasRecentReengagementDelivery(userId: string, now: Date): Promise<boolean> {
  const recentDeliveries = await notificationRepo.listDeliveriesByUserId(userId, 100);
  const cutoff = now.getTime() - CADENCE_DAYS * DAY_MS;

  return recentDeliveries.some((delivery) => {
    const payload = delivery.payload as { source?: string } | undefined;
    if (payload?.source !== 'engagement-reengagement') {
      return false;
    }

    const createdAt = Date.parse(delivery.createdAt);
    return Number.isFinite(createdAt) && createdAt >= cutoff;
  });
}

async function listInactiveCandidateUsers(now: Date): Promise<Array<{ userId: string; timezone: string }>> {
  const inactiveSince = new Date(now.getTime() - INACTIVITY_DAYS * DAY_MS);

  const users = await prisma.user.findMany({
    where: {
      settings: {
        notifications: true,
      },
      notificationPreferences: {
        infrastructureEnabled: true,
      },
      devices: {
        some: {
          isActive: true,
        },
      },
      favorites: {
        none: {
          deletedAt: null,
          updatedAt: {
            gte: inactiveSince,
          },
        },
      },
    },
    select: {
      id: true,
      notificationPreferences: {
        select: {
          timezone: true,
        },
      },
    },
  });

  return users.map((user) => ({
    userId: user.id,
    timezone: user.notificationPreferences?.timezone ?? 'UTC',
  }));
}

export class EngagementNotificationService {
  private timer?: NodeJS.Timeout;
  private running = false;

  async tick(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;
    try {
      const now = new Date();
      const candidates = await listInactiveCandidateUsers(now);

      for (const candidate of candidates) {
        if (!shouldSendInWindow(now, candidate.timezone)) {
          continue;
        }

        if (await hasRecentReengagementDelivery(candidate.userId, now)) {
          continue;
        }

        const template = pickTemplate(candidate.userId);

        await notificationRepo.enqueueJob({
          userId: candidate.userId,
          category: 'infrastructure',
          title: template.title,
          body: template.body,
          payload: {
            source: 'engagement-reengagement',
            timezone: candidate.timezone,
            sentForDate: toDayKey(now, candidate.timezone),
            inactivityDaysThreshold: INACTIVITY_DAYS,
            cadenceDays: CADENCE_DAYS,
            intent: 'reopen-app',
          },
        });
      }
    } finally {
      this.running = false;
    }
  }

  start(): void {
    void this.tick();
    this.timer = setInterval(() => {
      void this.tick();
    }, 60 * 60 * 1000);

    this.timer.unref();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}
