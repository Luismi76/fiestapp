import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { Resend } from 'resend';
import {
  getMatchRequestTemplate,
  getMatchAcceptedTemplate,
  getMatchRejectedTemplate,
  getMatchCancelledTemplate,
  getMatchCompletedTemplate,
  getDisputeOpenedTemplate,
  getDisputeMessageTemplate,
  getDisputeResolvedTemplate,
  getWalletChargedTemplate,
  getWalletLowBalanceTemplate,
  getPaymentReceiptTemplate,
  getPayoutProcessedTemplate,
  getReviewRequestTemplate,
  getReviewReceivedTemplate,
} from './templates';

@Injectable()
export class EmailService {
  private resend: Resend | null = null;
  private readonly logger = new Logger(EmailService.name);
  private fromEmail: string;
  private readonly useQueue: boolean;
  private readonly isConfigured: boolean;

  constructor(
    private configService: ConfigService,
    @Optional() @InjectQueue('email') private emailQueue?: Queue,
  ) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.isConfigured = !!apiKey;

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Email service configured with Resend');
    } else {
      this.logger.warn(
        'RESEND_API_KEY not configured - emails will be logged only',
      );
    }

    this.fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      'FiestApp <noreply@fiestapp.com>';
    this.useQueue = !!emailQueue;

    if (this.useQueue) {
      this.logger.log('Email queue enabled (Redis connected)');
    }
  }

  /**
   * Envía un email directamente o lo encola si hay Redis disponible
   */
  private async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<boolean> {
    // If not configured, just log
    if (!this.isConfigured || !this.resend) {
      this.logger.log(`[DEV] Email would be sent to ${to}: ${subject}`);
      return true;
    }

    if (this.useQueue && this.emailQueue) {
      try {
        await this.emailQueue.add(
          { to, subject, html },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
            removeOnFail: false,
          },
        );
        this.logger.debug(`Email queued for ${to}`);
        return true;
      } catch (error) {
        this.logger.warn(`Failed to queue email, sending directly: ${error}`);
        // Fallback to direct sending
      }
    }

    // Direct sending
    try {
      const { error } = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
      });

      if (error) {
        this.logger.error(`Error sending email: ${error.message}`);
        return false;
      }

      this.logger.log(`Email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error}`);
      return false;
    }
  }

  async sendVerificationEmail(
    email: string,
    token: string,
    name: string,
  ): Promise<boolean> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    const html = this.getVerificationEmailTemplate(name, verificationUrl);
    return this.sendEmail(email, 'Verifica tu cuenta en FiestApp', html);
  }

  async sendPasswordResetEmail(
    email: string,
    token: string,
    name: string,
  ): Promise<boolean> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    const html = this.getPasswordResetEmailTemplate(name, resetUrl);
    return this.sendEmail(email, 'Restablecer contraseña - FiestApp', html);
  }

  private getPasswordResetEmailTemplate(
    name: string,
    resetUrl: string,
  ): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecer contraseña</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">FiestApp</h1>
              <p style="color: rgba(255, 255, 255, 0.8); margin: 10px 0 0; font-size: 14px;">Vive las fiestas como un local</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 24px;">Hola, ${name}</h2>
              <p style="color: #4b5563; margin: 0 0 25px; font-size: 16px; line-height: 1.6;">
                Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en FiestApp. Haz clic en el botón de abajo para crear una nueva contraseña.
              </p>
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${resetUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 12px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
                      Restablecer contraseña
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color: #6b7280; margin: 25px 0 0; font-size: 14px; line-height: 1.6;">
                Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:
              </p>
              <p style="color: #2563eb; margin: 10px 0 0; font-size: 14px; word-break: break-all;">
                ${resetUrl}
              </p>
              <div style="margin-top: 30px; padding-top: 25px; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; margin: 0; font-size: 13px;">
                  Este enlace expira en 1 hora. Si no has solicitado restablecer tu contraseña, puedes ignorar este email.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 25px 30px; text-align: center;">
              <p style="color: #9ca3af; margin: 0; font-size: 13px;">
                &copy; ${new Date().getFullYear()} FiestApp. Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  async sendReminderEmail(
    email: string,
    name: string,
    experienceTitle: string,
    experienceCity: string,
    hostName: string,
    startDate: Date,
    daysUntil: number,
    matchId: string,
  ): Promise<boolean> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const matchUrl = `${frontendUrl}/matches/${matchId}`;

    const html = this.getReminderEmailTemplate(
      name,
      experienceTitle,
      experienceCity,
      hostName,
      startDate,
      daysUntil,
      matchUrl,
    );

    const subject =
      daysUntil === 1
        ? `Tu experiencia en ${experienceCity} es mañana`
        : `Tu experiencia en ${experienceCity} es en ${daysUntil} días`;

    return this.sendEmail(email, subject, html);
  }

  private getReminderEmailTemplate(
    name: string,
    experienceTitle: string,
    experienceCity: string,
    hostName: string,
    startDate: Date,
    daysUntil: number,
    matchUrl: string,
  ): string {
    const formattedDate = startDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const urgencyText =
      daysUntil === 1 ? '¡Es mañana!' : `Faltan ${daysUntil} días`;

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recordatorio de experiencia</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">FiestApp</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0; font-size: 18px; font-weight: 600;">${urgencyText}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 24px;">Hola, ${name}</h2>
              <p style="color: #4b5563; margin: 0 0 25px; font-size: 16px; line-height: 1.6;">
                Te recordamos que tienes una experiencia programada:
              </p>

              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #92400e; margin: 0 0 10px; font-size: 18px;">${experienceTitle}</h3>
                <p style="color: #78350f; margin: 0 0 8px; font-size: 14px;">
                  📍 <strong>${experienceCity}</strong>
                </p>
                <p style="color: #78350f; margin: 0 0 8px; font-size: 14px;">
                  📅 <strong>${formattedDate}</strong>
                </p>
                <p style="color: #78350f; margin: 0; font-size: 14px;">
                  👤 Con <strong>${hostName}</strong>
                </p>
              </div>

              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${matchUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 12px; box-shadow: 0 4px 14px rgba(249, 115, 22, 0.4);">
                      Ver detalles
                    </a>
                  </td>
                </tr>
              </table>

              <div style="margin-top: 30px; padding-top: 25px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.6;">
                  <strong>Consejos:</strong>
                </p>
                <ul style="color: #6b7280; margin: 10px 0 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
                  <li>Contacta con ${hostName} si tienes dudas</li>
                  <li>Confirma el punto de encuentro</li>
                  <li>Lleva ropa cómoda y adecuada</li>
                </ul>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 25px 30px; text-align: center;">
              <p style="color: #9ca3af; margin: 0; font-size: 13px;">
                &copy; ${new Date().getFullYear()} FiestApp. Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  private getVerificationEmailTemplate(
    name: string,
    verificationUrl: string,
  ): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifica tu cuenta</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">FiestApp</h1>
              <p style="color: rgba(255, 255, 255, 0.8); margin: 10px 0 0; font-size: 14px;">Vive las fiestas como un local</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 24px;">Hola, ${name}</h2>
              <p style="color: #4b5563; margin: 0 0 25px; font-size: 16px; line-height: 1.6;">
                Gracias por registrarte en FiestApp. Para completar tu registro y empezar a descubrir experiencias autenticas en fiestas populares, por favor verifica tu direccion de email haciendo clic en el boton de abajo.
              </p>

              <!-- Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${verificationUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 12px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
                      Verificar mi cuenta
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #6b7280; margin: 25px 0 0; font-size: 14px; line-height: 1.6;">
                Si no puedes hacer clic en el boton, copia y pega este enlace en tu navegador:
              </p>
              <p style="color: #2563eb; margin: 10px 0 0; font-size: 14px; word-break: break-all;">
                ${verificationUrl}
              </p>

              <div style="margin-top: 30px; padding-top: 25px; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; margin: 0; font-size: 13px;">
                  Este enlace expira en 24 horas. Si no has solicitado esta verificacion, puedes ignorar este email.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 25px 30px; text-align: center;">
              <p style="color: #9ca3af; margin: 0; font-size: 13px;">
                &copy; ${new Date().getFullYear()} FiestApp. Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  // ============================================
  // MATCH EMAILS
  // ============================================

  async sendMatchRequestEmail(
    hostEmail: string,
    hostName: string,
    requesterName: string,
    experienceTitle: string,
    experienceCity: string,
    startDate: Date,
    participants: number,
    totalPrice: number,
    matchId: string,
    currency: string = 'EUR',
  ): Promise<boolean> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const matchUrl = `${frontendUrl}/matches/${matchId}`;

    const html = getMatchRequestTemplate({
      hostName,
      requesterName,
      experienceTitle,
      experienceCity,
      startDate,
      participants,
      totalPrice,
      currency,
      matchUrl,
    });

    return this.sendEmail(
      hostEmail,
      `Nueva solicitud de ${requesterName} para ${experienceTitle}`,
      html,
    );
  }

  async sendMatchAcceptedEmail(
    requesterEmail: string,
    requesterName: string,
    hostName: string,
    experienceTitle: string,
    experienceCity: string,
    startDate: Date,
    totalPrice: number,
    matchId: string,
    currency: string = 'EUR',
    meetingPoint?: string,
  ): Promise<boolean> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const matchUrl = `${frontendUrl}/matches/${matchId}`;
    const chatUrl = `${frontendUrl}/messages?match=${matchId}`;

    const html = getMatchAcceptedTemplate({
      requesterName,
      hostName,
      experienceTitle,
      experienceCity,
      startDate,
      meetingPoint,
      totalPrice,
      currency,
      matchUrl,
      chatUrl,
    });

    return this.sendEmail(
      requesterEmail,
      `¡Reserva confirmada! ${experienceTitle} con ${hostName}`,
      html,
    );
  }

  async sendMatchRejectedEmail(
    requesterEmail: string,
    requesterName: string,
    hostName: string,
    experienceTitle: string,
    experienceCity: string,
    startDate: Date,
    reason?: string,
  ): Promise<boolean> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const searchUrl = `${frontendUrl}/experiences?city=${encodeURIComponent(experienceCity)}`;

    const html = getMatchRejectedTemplate({
      requesterName,
      hostName,
      experienceTitle,
      experienceCity,
      startDate,
      reason,
      searchUrl,
    });

    return this.sendEmail(
      requesterEmail,
      `Actualización de tu solicitud para ${experienceTitle}`,
      html,
    );
  }

  async sendMatchCancelledEmail(
    userEmail: string,
    userName: string,
    otherPartyName: string,
    experienceTitle: string,
    experienceCity: string,
    startDate: Date,
    cancelledByHost: boolean,
    reason?: string,
    refundAmount?: number,
    refundPercentage?: number,
    currency: string = 'EUR',
  ): Promise<boolean> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const walletUrl = `${frontendUrl}/wallet`;
    const searchUrl = `${frontendUrl}/experiences`;

    const html = getMatchCancelledTemplate({
      userName,
      otherPartyName,
      experienceTitle,
      experienceCity,
      startDate,
      cancelledByHost,
      reason,
      refundAmount,
      refundPercentage,
      currency,
      walletUrl,
      searchUrl,
    });

    return this.sendEmail(
      userEmail,
      `Reserva cancelada: ${experienceTitle}`,
      html,
    );
  }

  async sendMatchCompletedEmail(
    userEmail: string,
    userName: string,
    otherPartyName: string,
    experienceTitle: string,
    experienceCity: string,
    startDate: Date,
    isHost: boolean,
    matchId: string,
    earnedAmount?: number,
    currency: string = 'EUR',
  ): Promise<boolean> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const reviewUrl = `${frontendUrl}/matches/${matchId}/review`;

    const html = getMatchCompletedTemplate({
      userName,
      otherPartyName,
      experienceTitle,
      experienceCity,
      startDate,
      isHost,
      reviewUrl,
      earnedAmount,
      currency,
    });

    return this.sendEmail(
      userEmail,
      `¡Experiencia completada! ${experienceTitle}`,
      html,
    );
  }

  // ============================================
  // DISPUTE EMAILS
  // ============================================

  async sendDisputeOpenedEmail(
    userEmail: string,
    userName: string,
    isOpener: boolean,
    disputeId: string,
    experienceTitle: string,
    otherPartyName: string,
    reason: string,
    description: string,
  ): Promise<boolean> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const disputeUrl = `${frontendUrl}/disputes/${disputeId}`;

    const html = getDisputeOpenedTemplate({
      userName,
      isOpener,
      disputeId,
      experienceTitle,
      otherPartyName,
      reason,
      description,
      disputeUrl,
    });

    const subject = isOpener
      ? `Disputa registrada #${disputeId.slice(0, 8).toUpperCase()}`
      : `Se ha abierto una disputa contigo #${disputeId.slice(0, 8).toUpperCase()}`;

    return this.sendEmail(userEmail, subject, html);
  }

  async sendDisputeMessageEmail(
    userEmail: string,
    userName: string,
    senderName: string,
    isAdmin: boolean,
    disputeId: string,
    messagePreview: string,
  ): Promise<boolean> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const disputeUrl = `${frontendUrl}/disputes/${disputeId}`;

    const html = getDisputeMessageTemplate({
      userName,
      senderName,
      isAdmin,
      disputeId,
      messagePreview,
      disputeUrl,
    });

    const sender = isAdmin ? 'el equipo de FiestApp' : senderName;
    return this.sendEmail(
      userEmail,
      `Nuevo mensaje de ${sender} en tu disputa`,
      html,
    );
  }

  async sendDisputeResolvedEmail(
    userEmail: string,
    userName: string,
    disputeId: string,
    experienceTitle: string,
    resolution:
      | 'RESOLVED_REFUND'
      | 'RESOLVED_PARTIAL_REFUND'
      | 'RESOLVED_NO_REFUND'
      | 'CLOSED',
    resolutionDescription: string,
    refundAmount?: number,
    refundPercentage?: number,
    currency: string = 'EUR',
  ): Promise<boolean> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const disputeUrl = `${frontendUrl}/disputes/${disputeId}`;
    const walletUrl = `${frontendUrl}/wallet`;

    const html = getDisputeResolvedTemplate({
      userName,
      disputeId,
      experienceTitle,
      resolution,
      resolutionDescription,
      refundAmount,
      refundPercentage,
      currency,
      disputeUrl,
      walletUrl,
    });

    return this.sendEmail(
      userEmail,
      `Disputa #${disputeId.slice(0, 8).toUpperCase()} resuelta`,
      html,
    );
  }

  // ============================================
  // WALLET EMAILS
  // ============================================

  async sendWalletChargedEmail(
    userEmail: string,
    userName: string,
    amount: number,
    transactionType: 'topup' | 'earnings' | 'refund',
    description: string,
    newBalance: number,
    currency: string = 'EUR',
  ): Promise<boolean> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const walletUrl = `${frontendUrl}/wallet`;

    const html = getWalletChargedTemplate({
      userName,
      amount,
      currency,
      transactionType,
      description,
      newBalance,
      walletUrl,
    });

    const typeLabels = {
      topup: 'Recarga de saldo',
      earnings: 'Ingresos recibidos',
      refund: 'Reembolso recibido',
    };

    return this.sendEmail(
      userEmail,
      `${typeLabels[transactionType]} - FiestApp`,
      html,
    );
  }

  async sendWalletLowBalanceEmail(
    userEmail: string,
    userName: string,
    currentBalance: number,
    threshold: number,
    currency: string = 'EUR',
  ): Promise<boolean> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const topupUrl = `${frontendUrl}/wallet/topup`;

    const html = getWalletLowBalanceTemplate({
      userName,
      currentBalance,
      currency,
      threshold,
      topupUrl,
    });

    return this.sendEmail(userEmail, 'Tu saldo en FiestApp está bajo', html);
  }

  async sendPaymentReceiptEmail(
    userEmail: string,
    userName: string,
    transactionId: string,
    amount: number,
    paymentMethod: 'stripe' | 'paypal' | 'wallet',
    experienceTitle: string,
    experienceCity: string,
    startDate: Date,
    hostName: string,
    matchId: string,
    currency: string = 'EUR',
  ): Promise<boolean> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const matchUrl = `${frontendUrl}/matches/${matchId}`;

    const html = getPaymentReceiptTemplate({
      userName,
      transactionId,
      amount,
      currency,
      paymentMethod,
      experienceTitle,
      experienceCity,
      startDate,
      hostName,
      matchUrl,
    });

    return this.sendEmail(userEmail, 'Recibo de pago - FiestApp', html);
  }

  async sendPayoutProcessedEmail(
    hostEmail: string,
    hostName: string,
    amount: number,
    experienceCount: number,
    estimatedArrival: string,
    currency: string = 'EUR',
    bankLast4?: string,
  ): Promise<boolean> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const walletUrl = `${frontendUrl}/wallet`;

    const html = getPayoutProcessedTemplate({
      hostName,
      amount,
      currency,
      experienceCount,
      bankLast4,
      estimatedArrival,
      walletUrl,
    });

    return this.sendEmail(
      hostEmail,
      'Retiro de fondos procesado - FiestApp',
      html,
    );
  }

  // ============================================
  // REVIEW EMAILS
  // ============================================

  async sendReviewRequestEmail(
    userEmail: string,
    userName: string,
    otherPartyName: string,
    isHost: boolean,
    experienceTitle: string,
    experienceCity: string,
    experienceDate: Date,
    matchId: string,
  ): Promise<boolean> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const reviewUrl = `${frontendUrl}/matches/${matchId}/review`;

    const html = getReviewRequestTemplate({
      userName,
      otherPartyName,
      isHost,
      experienceTitle,
      experienceCity,
      experienceDate,
      reviewUrl,
    });

    return this.sendEmail(userEmail, `¿Qué tal fue ${experienceTitle}?`, html);
  }

  async sendReviewReceivedEmail(
    userEmail: string,
    userName: string,
    reviewerName: string,
    rating: number,
    comment: string,
    experienceTitle: string,
    reviewId: string,
    canRespond: boolean = true,
  ): Promise<boolean> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const reviewUrl = `${frontendUrl}/reviews/${reviewId}`;

    const html = getReviewReceivedTemplate({
      userName,
      reviewerName,
      rating,
      comment,
      experienceTitle,
      reviewUrl,
      canRespond,
    });

    return this.sendEmail(
      userEmail,
      `${reviewerName} te ha dejado una reseña`,
      html,
    );
  }
}
