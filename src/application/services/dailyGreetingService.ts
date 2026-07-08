import { NotificationPreferenceRepository } from '../../infrastructure/repositories/notificationPreferenceRepository';
import { NotificationRepository } from '../../infrastructure/repositories/notificationRepository';

const preferenceRepo = new NotificationPreferenceRepository();
const notificationRepo = new NotificationRepository();

const MORNING_MINUTES = 7 * 60;
const MORNING_WINDOW_MINUTES = 120;
const NIGHT_MINUTES = 22 * 60;
const NIGHT_WINDOW_MINUTES = 90;

const DAY_MINUTES = 24 * 60;

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

function withinWindow(localMinutes: number, targetMinutes: number, windowMinutes: number): boolean {
  if (windowMinutes <= 0 || windowMinutes > DAY_MINUTES) {
    return false;
  }

  const windowEnd = (targetMinutes + windowMinutes) % DAY_MINUTES;

  if (targetMinutes < windowEnd) {
    return localMinutes >= targetMinutes && localMinutes < windowEnd;
  }

  return localMinutes >= targetMinutes || localMinutes < windowEnd;
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
      body: 'Good morning. Open Mae to check nearby spots and plan one stop for today.',
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
    title: 'Good evening',
    body: 'Good evening. Take a quick look at your saved places for tomorrow.',
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
      const now = new Date();
      const recipients = await preferenceRepo.listGreetingRecipients();

      for (const recipient of recipients) {
        const localMinutes = getLocalMinutes(now, recipient.timezone);

        if (withinWindow(localMinutes, MORNING_MINUTES, MORNING_WINDOW_MINUTES)) {
          await enqueueGreeting(recipient.userId, recipient.timezone, 'morning');
        }

        if (withinWindow(localMinutes, NIGHT_MINUTES, NIGHT_WINDOW_MINUTES)) {
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

    this.timer.unref();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}
