import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

interface EmailJobData {
  to: string;
  subject: string;
  html: string;
}

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);
  private resend: Resend;
  private fromEmail: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = new Resend(apiKey);
    this.fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      'FiestApp <noreply@fiestapp.com>';
  }

  @Process()
  async handleEmail(job: Job<EmailJobData>) {
    this.logger.debug(`Processing email job ${job.id} to ${job.data.to}`);

    try {
      const { error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: job.data.to,
        subject: job.data.subject,
        html: job.data.html,
      });

      if (error) {
        this.logger.error(`Email job ${job.id} failed: ${error.message}`);
        throw new Error(error.message);
      }

      this.logger.log(`Email job ${job.id} completed: sent to ${job.data.to}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Email job ${job.id} failed: ${error}`);
      throw error;
    }
  }
}
