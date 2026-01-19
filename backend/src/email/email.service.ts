import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;
  private readonly logger = new Logger(EmailService.name);
  private fromEmail: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = new Resend(apiKey);
    this.fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      'FiestApp <noreply@fiestapp.com>';
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

    try {
      const { error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Verifica tu cuenta en FiestApp',
        html,
      });

      if (error) {
        this.logger.error(`Error sending verification email: ${error.message}`);
        return false;
      }

      this.logger.log(`Verification email sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send verification email: ${error}`);
      return false;
    }
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

    try {
      const { error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Restablecer contraseña - FiestApp',
        html,
      });

      if (error) {
        this.logger.error(`Error sending password reset email: ${error.message}`);
        return false;
      }

      this.logger.log(`Password reset email sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send password reset email: ${error}`);
      return false;
    }
  }

  private getPasswordResetEmailTemplate(name: string, resetUrl: string): string {
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

    try {
      const subject =
        daysUntil === 1
          ? `Tu experiencia en ${experienceCity} es mañana`
          : `Tu experiencia en ${experienceCity} es en ${daysUntil} días`;

      const { error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject,
        html,
      });

      if (error) {
        this.logger.error(`Error sending reminder email: ${error.message}`);
        return false;
      }

      this.logger.log(`Reminder email sent to ${email} for match ${matchId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send reminder email: ${error}`);
      return false;
    }
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
      daysUntil === 1
        ? '¡Es mañana!'
        : `Faltan ${daysUntil} días`;

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
}
