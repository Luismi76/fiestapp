import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private client: twilio.Twilio | null = null;
  private fromNumber: string;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber =
      this.configService.get<string>('TWILIO_PHONE_NUMBER') || '';

    if (accountSid && authToken) {
      this.client = twilio.default(accountSid, authToken);
      this.logger.log('Twilio client initialized');
    } else {
      this.logger.warn(
        'Twilio credentials not configured. SMS sending will be simulated.',
      );
    }
  }

  async sendVerificationCode(phone: string, code: string): Promise<boolean> {
    const message = `Tu código de verificación de FiestApp es: ${code}. Válido por 10 minutos.`;

    if (!this.client) {
      // Development mode: log the code instead of sending SMS
      this.logger.log(`[DEV MODE] SMS to ${phone}: ${message}`);
      this.logger.log(`[DEV MODE] Verification code: ${code}`);
      return true;
    }

    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: phone,
      });

      this.logger.log(`SMS sent to ${phone}, SID: ${result.sid}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${phone}:`, error);
      return false;
    }
  }

  generateVerificationCode(): string {
    // Generate a 6-digit code
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
