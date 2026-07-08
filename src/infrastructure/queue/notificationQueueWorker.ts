import { NotificationRepository } from '../repositories/notificationRepository';
import { processNotificationJob } from '../../application/services/pushNotificationService';

export class NotificationQueueWorker {
  private timer?: NodeJS.Timeout;
  private readonly notificationRepo = new NotificationRepository();
  private readonly pollMs: number;
  private isRunning = false;

  constructor(pollMs = 3000) {
    this.pollMs = pollMs;
  }

  start() {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      void this.tick();
    }, this.pollMs);

    this.timer.unref();
    console.log(`Notification queue worker started (poll every ${this.pollMs}ms)`);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private async tick() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      const job = await this.notificationRepo.claimNextJob();
      if (!job) {
        return;
      }

      await processNotificationJob(job);
    } catch (error) {
      console.error('Notification worker tick failed', error);
    } finally {
      this.isRunning = false;
    }
  }
}
