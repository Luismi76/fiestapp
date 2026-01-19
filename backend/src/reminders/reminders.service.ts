import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
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
        await this.emailService.sendReminderEmail(
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
        await this.emailService.sendReminderEmail(
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
        await this.emailService.sendReminderEmail(
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
        await this.emailService.sendReminderEmail(
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

  // Manual trigger for testing
  async triggerReminders() {
    await this.sendReminders();
    return { message: 'Reminders sent' };
  }
}
