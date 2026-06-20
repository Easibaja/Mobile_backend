import { NotificationPreferenceRepository } from '../../infrastructure/repositories/notificationPreferenceRepository';
import { NotificationRepository } from '../../infrastructure/repositories/notificationRepository';

const preferenceRepo = new NotificationPreferenceRepository();
const notificationRepo = new NotificationRepository();

const MORNING_MINUTES = 7 * 60;
const NIGHT_MINUTES = 22 * 60;

function getLocalMinutes(now: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');

  return hour * 60 + minute;
}

function getLocalDateKey(now: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function isSameLocalDay(a: string, b: string): boolean {
  return a === b;
}

async function alreadySentToday(userId: string, timezone: string, greetingType: 'morning' | 'night'): Promise<boolean> {
  const deliveries = await notificationRepo.listDeliveriesByUserId(userId, 50);
  const today = getLocalDateKey(new Date(), timezone);

  return deliveries.some((delivery) => {
    const payload = delivery.payload as { source?: string; greetingType?: string; sentForDate?: string } | undefined;
    if (payload?.source !== 'daily-greeting') {
      return false;
    }

    if (payload.greetingType !== greetingType) {
      return false;
    }

    return typeof payload.sentForDate === 'string' && isSameLocalDay(payload.sentForDate, today);
  });
}

async function enqueueGreeting(userId: string, timezone: string, greetingType: 'morning' | 'night'): Promise<void> {
  const today = getLocalDateKey(new Date(), timezone);

  if (await alreadySentToday(userId, timezone, greetingType)) {
    return;
  }

  if (greetingType === 'morning') {
    await notificationRepo.enqueueJob({
      userId,
      category: 'infrastructure',
      title: 'Good morning',
      body: 'Good morning! A new day is ready for your favorite places.',
      payload: {
        source: 'daily-greeting',
        greetingType,
        sentForDate: today,
        timezone,
      },
    });
    return;
  }

  await notificationRepo.enqueueJob({
    userId,
    category: 'infrastructure',
    title: 'Good night',
    body: 'Good night! We will be ready with more updates tomorrow.',
    payload: {
      source: 'daily-greeting',
      greetingType,
      sentForDate: today,
      timezone,
    },
  });
}

export class DailyGreetingService {
  private timer?: NodeJS.Timeout;
  private running = false;

  async tick(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;
    try {
      const recipients = await preferenceRepo.listGreetingRecipients();

      for (const recipient of recipients) {
        const localMinutes = getLocalMinutes(new Date(), recipient.timezone);

        if (localMinutes === MORNING_MINUTES) {
          await enqueueGreeting(recipient.userId, recipient.timezone, 'morning');
        }

        if (localMinutes === NIGHT_MINUTES) {
          await enqueueGreeting(recipient.userId, recipient.timezone, 'night');
        }
      }
    } finally {
      this.running = false;
    }
  }

  start(): void {
    void this.tick();
    this.timer = setInterval(() => {
      void this.tick();
    }, 60_000);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}
