import { Controller, Post, Body, HttpCode, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CreateFeedbackDto } from './dto/feedback.dto';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('feedback')
@Controller('feedback')
export class FeedbackController {
  private readonly logger = new Logger(FeedbackController.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @HttpCode(200)
  @Throttle({
    short: { limit: 1, ttl: 30000 },
    medium: { limit: 2, ttl: 60000 },
    long: { limit: 5, ttl: 3600000 },
  })
  @ApiOperation({ summary: 'Enviar feedback sobre la aplicación' })
  @ApiResponse({ status: 200, description: 'Feedback enviado correctamente' })
  @ApiResponse({ status: 429, description: 'Demasiados intentos' })
  async sendFeedback(
    @Body() dto: CreateFeedbackDto,
  ): Promise<{ message: string }> {
    const devEmail =
      this.configService.get<string>('DEV_EMAIL') || 'dev@fiestapp.com';

    const stars = '★'.repeat(dto.rating) + '☆'.repeat(5 - dto.rating);

    const html = this.buildFeedbackEmailHtml(dto, stars);

    try {
      await this.emailService.sendGenericEmail(
        devEmail,
        `[FiestApp Feedback] ${dto.category} - ${stars}`,
        html,
      );
    } catch (error) {
      this.logger.error(`Error enviando feedback: ${error}`);
    }

    this.logger.log(
      `Feedback recibido de ${dto.name} (${dto.email}) - ${dto.category} - ${dto.rating}/5`,
    );

    return { message: 'Feedback enviado correctamente. ¡Gracias!' };
  }

  private buildFeedbackEmailHtml(
    dto: CreateFeedbackDto,
    stars: string,
  ): string {
    return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #C41E3A 0%, #E6A817 100%); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Nuevo Feedback</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 16px;">FiestApp Demo</p>
        </div>
        <div style="padding: 32px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #374151; width: 120px;">Nombre</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #6b7280;">${dto.name}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #374151;">Email</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #6b7280;"><a href="mailto:${dto.email}" style="color: #C41E3A;">${dto.email}</a></td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #374151;">Categoría</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #6b7280; text-transform: capitalize;">${dto.category}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #374151;">Valoración</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #E6A817; font-size: 20px;">${stars}</td>
            </tr>
          </table>
          <div style="margin-top: 24px; padding: 20px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #C41E3A;">
            <p style="margin: 0 0 8px; font-weight: 600; color: #374151;">Mensaje:</p>
            <p style="margin: 0; color: #6b7280; line-height: 1.6; white-space: pre-wrap;">${dto.message}</p>
          </div>
        </div>
      </div>
    `;
  }
}
