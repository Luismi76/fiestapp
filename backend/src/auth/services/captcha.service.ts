import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface CaptchaVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
}

@Injectable()
export class CaptchaService {
  private readonly hcaptchaSecret: string | undefined;
  private readonly recaptchaSecret: string | undefined;
  private readonly enabled: boolean;

  constructor(private configService: ConfigService) {
    this.hcaptchaSecret = this.configService.get<string>('HCAPTCHA_SECRET');
    this.recaptchaSecret = this.configService.get<string>('RECAPTCHA_SECRET');
    this.enabled = !!(this.hcaptchaSecret || this.recaptchaSecret);

    if (!this.enabled) {
      console.warn(
        '⚠️ CAPTCHA not configured (HCAPTCHA_SECRET or RECAPTCHA_SECRET). Captcha verification disabled.',
      );
    }
  }

  async verifyCaptcha(token: string | undefined): Promise<boolean> {
    // Si no está configurado, permitir todas las solicitudes
    if (!this.enabled) {
      return true;
    }

    if (!token) {
      throw new BadRequestException(
        'Token de CAPTCHA requerido. Por favor, completa el CAPTCHA.',
      );
    }

    try {
      // Intentar verificar con hCaptcha primero
      if (this.hcaptchaSecret) {
        return await this.verifyHCaptcha(token);
      }

      // Fallback a reCAPTCHA
      if (this.recaptchaSecret) {
        return await this.verifyRecaptcha(token);
      }

      return false;
    } catch (error) {
      console.error('Error verifying captcha:', error);
      throw new BadRequestException(
        'Error al verificar CAPTCHA. Por favor, inténtalo de nuevo.',
      );
    }
  }

  private async verifyHCaptcha(token: string): Promise<boolean> {
    const response = await axios.post<CaptchaVerifyResponse>(
      'https://hcaptcha.com/siteverify',
      new URLSearchParams({
        secret: this.hcaptchaSecret!,
        response: token,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    if (!response.data.success) {
      const errors =
        response.data['error-codes']?.join(', ') || 'Unknown error';
      console.warn(`hCaptcha verification failed: ${errors}`);
      throw new BadRequestException(
        'Verificación de CAPTCHA fallida. Por favor, inténtalo de nuevo.',
      );
    }

    return true;
  }

  private async verifyRecaptcha(token: string): Promise<boolean> {
    const response = await axios.post<CaptchaVerifyResponse>(
      'https://www.google.com/recaptcha/api/siteverify',
      new URLSearchParams({
        secret: this.recaptchaSecret!,
        response: token,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    if (!response.data.success) {
      const errors =
        response.data['error-codes']?.join(', ') || 'Unknown error';
      console.warn(`reCAPTCHA verification failed: ${errors}`);
      throw new BadRequestException(
        'Verificación de CAPTCHA fallida. Por favor, inténtalo de nuevo.',
      );
    }

    return true;
  }
}
