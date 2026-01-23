import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateSecret, generateURI, verifySync } from 'otplib';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TwoFactorService {
  private readonly appName: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.appName = this.configService.get<string>('APP_NAME') || 'FiestApp';
  }

  /**
   * Genera un nuevo secreto TOTP para el usuario
   */
  async generateTwoFactorSecret(userId: string): Promise<{
    secret: string;
    qrCodeDataUrl: string;
    otpAuthUrl: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException(
        '2FA ya está habilitado. Desactívalo primero si deseas reconfigurarlo.',
      );
    }

    // Generar secreto TOTP
    const secret = generateSecret();

    // Crear URL otpauth para apps de autenticación
    const otpAuthUrl = generateURI({
      secret,
      issuer: this.appName,
      label: user.email,
    });

    // Generar código QR como Data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    // Guardar el secreto temporalmente (no activado aún)
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    return {
      secret,
      qrCodeDataUrl,
      otpAuthUrl,
    };
  }

  /**
   * Verifica el código TOTP y habilita 2FA si es correcto
   */
  async enableTwoFactor(
    userId: string,
    token: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA ya está habilitado.');
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException(
        'Primero debes iniciar la configuración de 2FA.',
      );
    }

    // Verificar el token
    const result = verifySync({
      secret: user.twoFactorSecret,
      token,
    });

    if (!result.valid) {
      throw new BadRequestException(
        'Código inválido. Por favor, verifica e intenta de nuevo.',
      );
    }

    // Habilitar 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return {
      message: 'Autenticación de dos factores habilitada correctamente.',
    };
  }

  /**
   * Deshabilita 2FA para el usuario
   */
  async disableTwoFactor(
    userId: string,
    token: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('2FA no está habilitado.');
    }

    // Verificar el token antes de deshabilitar
    const result = verifySync({
      secret: user.twoFactorSecret!,
      token,
    });

    if (!result.valid) {
      throw new BadRequestException(
        'Código inválido. Por favor, verifica e intenta de nuevo.',
      );
    }

    // Deshabilitar 2FA y eliminar secreto
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    return {
      message: 'Autenticación de dos factores deshabilitada.',
    };
  }

  /**
   * Verifica un código TOTP durante el login
   */
  verifyToken(secret: string, token: string): boolean {
    const result = verifySync({ secret, token });
    return result.valid === true;
  }

  /**
   * Verifica si el usuario tiene 2FA habilitado
   */
  async isTwoFactorEnabled(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });

    return user?.twoFactorEnabled ?? false;
  }
}
