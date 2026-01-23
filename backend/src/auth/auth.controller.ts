import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Query,
  Res,
} from '@nestjs/common';
import type { Request as ExpressRequest, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CaptchaService } from './services/captcha.service';
import {
  RegisterDto,
  LoginDto,
  ResendVerificationDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { VerifyTwoFactorDto, LoginWith2FADto } from './dto/two-factor.dto';
import { TwoFactorService } from './services/two-factor.service';
import { GoogleUser } from './dto/social-auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { AuthenticatedUser } from './strategies/jwt.strategy';

interface AuthenticatedRequest extends ExpressRequest {
  user: AuthenticatedUser;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private captchaService: CaptchaService,
    private configService: ConfigService,
    private twoFactorService: TwoFactorService,
  ) {}

  @Post('register')
  @ApiOperation({
    summary: 'Registrar nuevo usuario',
    description:
      'Crea una nueva cuenta de usuario y envía email de verificación',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description:
      'Usuario registrado correctamente. Se ha enviado email de verificación.',
  })
  @ApiResponse({ status: 400, description: 'Datos de registro inválidos' })
  @ApiResponse({ status: 401, description: 'El email ya está registrado' })
  @ApiResponse({
    status: 429,
    description: 'Demasiados intentos. Rate limit excedido.',
  })
  @Throttle({
    short: { limit: 2, ttl: 1000 },
    medium: { limit: 5, ttl: 60000 },
    long: { limit: 20, ttl: 3600000 },
  })
  async register(@Body() registerDto: RegisterDto) {
    await this.captchaService.verifyCaptcha(registerDto.captchaToken);
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Iniciar sesión',
    description: 'Autentica al usuario y devuelve un token JWT',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso. Devuelve access_token y datos del usuario.',
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales inválidas o email no verificado',
  })
  @ApiResponse({
    status: 429,
    description: 'Demasiados intentos. Rate limit excedido.',
  })
  @Throttle({
    short: { limit: 3, ttl: 1000 },
    medium: { limit: 5, ttl: 60000 },
    long: { limit: 20, ttl: 3600000 },
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('verify-email')
  @ApiOperation({
    summary: 'Verificar email',
    description:
      'Verifica la dirección de email usando el token enviado por correo',
  })
  @ApiQuery({
    name: 'token',
    description: 'Token de verificación recibido por email',
  })
  @ApiResponse({ status: 200, description: 'Email verificado correctamente' })
  @ApiResponse({ status: 400, description: 'Token inválido o expirado' })
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @ApiOperation({
    summary: 'Reenviar email de verificación',
    description: 'Envía un nuevo email de verificación al usuario',
  })
  @ApiBody({ type: ResendVerificationDto })
  @ApiResponse({
    status: 200,
    description: 'Email de verificación reenviado (si existe)',
  })
  @ApiResponse({
    status: 400,
    description: 'Email ya verificado o espera requerida',
  })
  @ApiResponse({ status: 429, description: 'Rate limit excedido' })
  @Throttle({
    short: { limit: 1, ttl: 1000 },
    medium: { limit: 3, ttl: 60000 },
    long: { limit: 10, ttl: 3600000 },
  })
  async resendVerification(@Body() resendDto: ResendVerificationDto) {
    return this.authService.resendVerification(resendDto);
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Solicitar restablecimiento de contraseña',
    description: 'Envía un email con link para restablecer contraseña',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Email enviado si la cuenta existe',
  })
  @ApiResponse({ status: 429, description: 'Rate limit excedido' })
  @Throttle({
    short: { limit: 1, ttl: 1000 },
    medium: { limit: 3, ttl: 60000 },
    long: { limit: 10, ttl: 3600000 },
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'Restablecer contraseña',
    description:
      'Establece una nueva contraseña usando el token de restablecimiento',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Contraseña actualizada correctamente',
  })
  @ApiResponse({ status: 400, description: 'Token inválido o expirado' })
  @ApiResponse({ status: 429, description: 'Rate limit excedido' })
  @Throttle({
    short: { limit: 2, ttl: 1000 },
    medium: { limit: 5, ttl: 60000 },
    long: { limit: 15, ttl: 3600000 },
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }

  @Get('me')
  @ApiOperation({
    summary: 'Obtener perfil actual',
    description: 'Devuelve los datos del usuario autenticado',
  })
  @ApiBearerAuth('JWT')
  @ApiResponse({ status: 200, description: 'Datos del usuario autenticado' })
  @ApiResponse({ status: 401, description: 'No autenticado o token inválido' })
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: AuthenticatedRequest) {
    return this.authService.validateUser(req.user.userId);
  }

  // ========== Two-Factor Authentication (2FA) ==========

  // Verificar 2FA durante login (no requiere auth, usa tempToken)
  @Post('2fa/login')
  @Throttle({
    short: { limit: 3, ttl: 1000 },
    medium: { limit: 5, ttl: 60000 },
    long: { limit: 15, ttl: 3600000 },
  })
  async verifyTwoFactorLogin(@Body() dto: LoginWith2FADto) {
    return this.authService.verifyTwoFactorLogin(
      dto.tempToken,
      dto.twoFactorCode,
    );
  }

  // Iniciar configuración de 2FA
  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  async setupTwoFactor(@Request() req: AuthenticatedRequest) {
    return this.twoFactorService.generateTwoFactorSecret(req.user.userId);
  }

  // Verificar código y habilitar 2FA
  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  async enableTwoFactor(
    @Request() req: AuthenticatedRequest,
    @Body() dto: VerifyTwoFactorDto,
  ) {
    return this.twoFactorService.enableTwoFactor(req.user.userId, dto.token);
  }

  // Deshabilitar 2FA
  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  async disableTwoFactor(
    @Request() req: AuthenticatedRequest,
    @Body() dto: VerifyTwoFactorDto,
  ) {
    return this.twoFactorService.disableTwoFactor(req.user.userId, dto.token);
  }

  // Obtener estado de 2FA
  @Get('2fa/status')
  @UseGuards(JwtAuthGuard)
  async getTwoFactorStatus(@Request() req: AuthenticatedRequest) {
    const enabled = await this.twoFactorService.isTwoFactorEnabled(
      req.user.userId,
    );
    return { enabled };
  }

  // Iniciar flujo de Google OAuth
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // El guard redirige a Google automáticamente
  }

  // Callback de Google OAuth
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(
    @Request() req: ExpressRequest & { user: GoogleUser },
    @Res() res: Response,
  ) {
    const result = await this.authService.googleLogin(req.user);

    // Redirigir al frontend con el token
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/auth/callback?token=${result.access_token}`;

    res.redirect(redirectUrl);
  }
}
