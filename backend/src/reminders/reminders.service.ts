import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PushService } from '../notifications/push.service';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
    private pushService: PushService,
  ) {}

  // Run every day at 9:00 AM
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendReminders() {
    this.logger.log('Starting reminder check...');

    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Find matches starting in 1 day that haven't received 1-day reminder
    const oneDayMatches = await this.prisma.match.findMany({
      where: {
        status: 'accepted',
        startDate: {
          gte: now,
          lte: oneDayFromNow,
        },
        reminderOneDaySent: false,
      },
      include: {
        requester: { select: { id: true, email: true, name: true } },
        host: { select: { id: true, email: true, name: true } },
        experience: { select: { title: true, city: true } },
      },
    });

    // Find matches starting in 3 days that haven't received 3-day reminder
    const threeDaysMatches = await this.prisma.match.findMany({
      where: {
        status: 'accepted',
        startDate: {
          gte: oneDayFromNow,
          lte: threeDaysFromNow,
        },
        reminderThreeDaysSent: false,
      },
      include: {
        requester: { select: { id: true, email: true, name: true } },
        host: { select: { id: true, email: true, name: true } },
        experience: { select: { title: true, city: true } },
      },
    });

    this.logger.log(
      `Found ${oneDayMatches.length} matches for 1-day reminder, ${threeDaysMatches.length} for 3-day reminder`,
    );

    // Send 1-day reminders
    for (const match of oneDayMatches) {
      if (!match.startDate) continue;

      try {
        // Send to requester
        await this.sendReminder(
          match.requester.id,
          match.requester.email,
          match.requester.name,
          match.experience.title,
          match.experience.city,
          match.host.name,
          match.startDate,
          1,
          match.id,
        );

        // Send to host
        await this.sendReminder(
          match.host.id,
          match.host.email,
          match.host.name,
          match.experience.title,
          match.experience.city,
          match.requester.name,
          match.startDate,
          1,
          match.id,
        );

        // Mark as sent
        await this.prisma.match.update({
          where: { id: match.id },
          data: { reminderOneDaySent: true },
        });

        this.logger.log(`Sent 1-day reminders for match ${match.id}`);
      } catch (error) {
        this.logger.error(
          `Failed to send 1-day reminder for match ${match.id}: ${error}`,
        );
      }
    }

    // Send 3-day reminders
    for (const match of threeDaysMatches) {
      if (!match.startDate) continue;

      try {
        // Send to requester
        await this.sendReminder(
          match.requester.id,
          match.requester.email,
          match.requester.name,
          match.experience.title,
          match.experience.city,
          match.host.name,
          match.startDate,
          3,
          match.id,
        );

        // Send to host
        await this.sendReminder(
          match.host.id,
          match.host.email,
          match.host.name,
          match.experience.title,
          match.experience.city,
          match.requester.name,
          match.startDate,
          3,
          match.id,
        );

        // Mark as sent
        await this.prisma.match.update({
          where: { id: match.id },
          data: { reminderThreeDaysSent: true },
        });

        this.logger.log(`Sent 3-day reminders for match ${match.id}`);
      } catch (error) {
        this.logger.error(
          `Failed to send 3-day reminder for match ${match.id}: ${error}`,
        );
      }
    }

    this.logger.log('Reminder check complete');
  }

  /**
   * Envía recordatorio a un usuario (email, notificación in-app, push)
   */
  private async sendReminder(
    userId: string,
    email: string,
    name: string,
    experienceTitle: string,
    city: string,
    partnerName: string,
    date: Date,
    daysUntil: number,
    matchId: string,
  ) {
    // Check email preferences
    const shouldSendEmail = await this.notificationsService.shouldSendEmail(
      userId,
      'reminders',
    );

    // Send email if enabled
    if (shouldSendEmail) {
      await this.emailService.sendReminderEmail(
        email,
        name,
        experienceTitle,
        city,
        partnerName,
        date,
        daysUntil,
        matchId,
      );
    }

    // Create in-app notification
    if (daysUntil === 1) {
      await this.notificationsService.notifyReminder1Day(
        userId,
        matchId,
        experienceTitle,
        date,
      );
    } else {
      await this.notificationsService.notifyReminder3Days(
        userId,
        matchId,
        experienceTitle,
        date,
      );
    }

    // Send push notification
    await this.pushService.pushReminder(
      userId,
      experienceTitle,
      daysUntil,
      matchId,
    );
  }

  // Manual trigger for testing
  async triggerReminders() {
    await this.sendReminders();
    return { message: 'Reminders sent' };
  }

  /**
   * Limpia notificaciones antiguas (cron diario a las 3:00 AM)
   */
  @Cron('0 3 * * *')
  async cleanupOldNotifications() {
    this.logger.log('Starting notification cleanup...');
    const result = await this.notificationsService.deleteOldNotifications();
    this.logger.log(`Deleted ${result.count} old notifications`);
  }
}
