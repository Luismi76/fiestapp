import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';
import {
  RegisterDto,
  LoginDto,
  AuthResponseDto,
  RegisterResponseDto,
  ResendVerificationDto,
  TwoFactorRequiredResponseDto,
  LoginResponseDto,
} from './dto/auth.dto';
import { GoogleUser } from './dto/social-auth.dto';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { verifySync as verifyTOTP } from 'otplib';

@Injectable()
export class AuthService {
  private logPath = path.join(process.cwd(), 'auth-debug.log');

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  private log(message: string) {
    try {
      const timestamp = new Date().toISOString();
      fs.appendFileSync(
        this.logPath,
        `${timestamp} [${process.pid}] ${message}\n`,
      );
    } catch {
      console.log(`[LOG_FAIL] ${message}`);
    }
  }

  async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
    const { email, password, name, age, city, hasPartner, hasChildren, childrenAges } = registerDto;

    this.log(`Attempting registration for: ${email}`);

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      this.log(`Registration failed: Email ${email} already exists`);
      throw new UnauthorizedException('Email already registered');
    }

    this.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    this.log('Password hashed');

    const verificationToken = uuidv4();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    try {
      this.log('Starting DB transaction...');
      const user = await this.prisma.$transaction(async (tx) => {
        this.log('Transaction: Creating User...');
        const newUser = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            name,
            age,
            city,
            hasPartner,
            hasChildren,
            childrenAges,
            verified: false,
            emailVerificationToken: verificationToken,
            emailVerificationExpires: verificationExpires,
          },
        });
        this.log(`Transaction: User created with ID ${newUser.id}`);

        this.log('Transaction: Creating Wallet...');
        await tx.wallet.create({
          data: {
            userId: newUser.id,
            balance: 0,
          },
        });
        this.log('Transaction: Wallet created');

        return newUser;
      });
      this.log('DB transaction finished successfully');

      await this.emailService.sendVerificationEmail(
        email,
        verificationToken,
        name,
      );
      this.log(`Verification email sent to ${email}`);

      return {
        message:
          'Registro exitoso. Por favor, revisa tu email para verificar tu cuenta.',
        email: user.email,
      };
    } catch (error: unknown) {
      const errorString = JSON.stringify(
        error,
        Object.getOwnPropertyNames(error as object),
        2,
      );
      this.log(`CRITICAL REGISTRATION ERROR: ${errorString}`);
      this.log(`FULL ERROR OBJECT: ${String(error)}`);

      console.error('Registration error:', error);

      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const { email, password } = loginDto;
    this.log(`Login attempt for: ${email}`);

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      this.log(`Login failed: User ${email} not found`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      this.log(`Login failed: Invalid password for ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verificar si el usuario esta baneado
    if (user.bannedAt) {
      this.log(`Login failed: User ${email} is banned`);
      throw new UnauthorizedException(
        `Tu cuenta ha sido suspendida. Motivo: ${user.banReason || 'No especificado'}`,
      );
    }

    if (!user.verified) {
      this.log(`Login failed: Email not verified for ${email}`);
      throw new UnauthorizedException(
        'Por favor, verifica tu email antes de iniciar sesion. Revisa tu bandeja de entrada o solicita un nuevo email de verificacion.',
      );
    }

    // Si 2FA está habilitado, devolver token temporal
    if (user.twoFactorEnabled) {
      this.log(`2FA required for ${email}`);
      // Crear token temporal para 2FA (expira en 5 minutos)
      const tempPayload = {
        sub: user.id,
        email: user.email,
        type: '2fa_pending',
      };
      const tempToken = this.jwtService.sign(tempPayload, { expiresIn: '5m' });

      return {
        requiresTwoFactor: true,
        tempToken,
        message: 'Se requiere código de autenticación de dos factores.',
      } as TwoFactorRequiredResponseDto;
    }

    const payload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload);
    this.log(`Login successful for ${email}`);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar ?? undefined,
        verified: user.verified,
        city: user.city ?? undefined,
        age: user.age ?? undefined,
        bio: user.bio ?? undefined,
        hasPartner: user.hasPartner ?? undefined,
        hasChildren: user.hasChildren ?? undefined,
        childrenAges: user.childrenAges ?? undefined,
      },
    };
  }

  async verifyTwoFactorLogin(
    tempToken: string,
    twoFactorCode: string,
  ): Promise<AuthResponseDto> {
    this.log(`2FA verification attempt`);

    let payload: { sub: string; email: string; type?: string };
    try {
      payload = this.jwtService.verify(tempToken);
    } catch {
      throw new UnauthorizedException('Token temporal inválido o expirado.');
    }

    if (payload.type !== '2fa_pending') {
      throw new UnauthorizedException('Token inválido para verificación 2FA.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.twoFactorSecret) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    // Verificar el código TOTP
    const result = verifyTOTP({
      token: twoFactorCode,
      secret: user.twoFactorSecret,
    });

    if (!result.valid) {
      this.log(`2FA verification failed for ${user.email}`);
      throw new UnauthorizedException('Código de autenticación inválido.');
    }

    // Generar el JWT completo
    const fullPayload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(fullPayload);
    this.log(`2FA verification successful for ${user.email}`);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar ?? undefined,
        verified: user.verified,
        city: user.city ?? undefined,
        age: user.age ?? undefined,
        bio: user.bio ?? undefined,
        hasPartner: user.hasPartner ?? undefined,
        hasChildren: user.hasChildren ?? undefined,
        childrenAges: user.childrenAges ?? undefined,
      },
    };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    this.log(`Attempting to verify email with token: ${token}`);

    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
      },
    });

    if (!user) {
      this.log(`Verification failed: Invalid token ${token}`);
      throw new BadRequestException(
        'Token de verificacion invalido o expirado.',
      );
    }

    if (
      user.emailVerificationExpires &&
      user.emailVerificationExpires < new Date()
    ) {
      this.log(`Verification failed: Token expired for ${user.email}`);
      throw new BadRequestException(
        'El token de verificacion ha expirado. Por favor, solicita uno nuevo.',
      );
    }

    if (user.verified) {
      this.log(`Email already verified for ${user.email}`);
      return { message: 'Tu email ya ha sido verificado. Puedes iniciar sesion.' };
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    this.log(`Email verified successfully for ${user.email}`);
    return {
      message:
        'Email verificado correctamente. Ya puedes iniciar sesion en FiestApp.',
    };
  }

  async resendVerification(
    resendDto: ResendVerificationDto,
  ): Promise<{ message: string }> {
    const { email } = resendDto;
    this.log(`Resend verification requested for: ${email}`);

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return {
        message:
          'Si el email existe en nuestro sistema, recibiras un correo de verificacion.',
      };
    }

    if (user.verified) {
      this.log(`Resend failed: Email already verified for ${email}`);
      throw new BadRequestException('Este email ya ha sido verificado.');
    }

    if (
      user.emailVerificationExpires &&
      user.emailVerificationExpires > new Date(Date.now() - 60 * 1000)
    ) {
      const lastSent = user.emailVerificationExpires.getTime() - 24 * 60 * 60 * 1000;
      const timeSinceLastSent = Date.now() - lastSent;
      if (timeSinceLastSent < 60 * 1000) {
        this.log(`Resend failed: Too soon for ${email}`);
        throw new BadRequestException(
          'Por favor, espera al menos 60 segundos antes de solicitar otro email de verificacion.',
        );
      }
    }

    const verificationToken = uuidv4();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      },
    });

    await this.emailService.sendVerificationEmail(
      email,
      verificationToken,
      user.name,
    );

    this.log(`Verification email resent to ${email}`);
    return {
      message:
        'Si el email existe en nuestro sistema, recibiras un correo de verificacion.',
    };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        city: true,
        bio: true,
        age: true,
        verified: true,
        hasPartner: true,
        hasChildren: true,
        childrenAges: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    this.log(`Forgot password requested for: ${email}`);

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Siempre devolver el mismo mensaje por seguridad
    const successMessage = {
      message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña.',
    };

    if (!user) {
      return successMessage;
    }

    const resetToken = uuidv4();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    await this.emailService.sendPasswordResetEmail(email, resetToken, user.name);
    this.log(`Password reset email sent to ${email}`);

    return successMessage;
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    this.log(`Reset password attempt with token: ${token}`);

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
      },
    });

    if (!user) {
      this.log(`Reset failed: Invalid token ${token}`);
      throw new BadRequestException('Token inválido o expirado.');
    }

    if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
      this.log(`Reset failed: Token expired for ${user.email}`);
      throw new BadRequestException('El token ha expirado. Solicita uno nuevo.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    this.log(`Password reset successful for ${user.email}`);
    return { message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' };
  }

  async googleLogin(googleUser: GoogleUser): Promise<AuthResponseDto> {
    this.log(`Google login attempt for: ${googleUser.email}`);

    if (!googleUser.email) {
      throw new BadRequestException(
        'No se pudo obtener el email de Google. Por favor, verifica los permisos.',
      );
    }

    // Buscar usuario existente por email
    let user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (user) {
      // Usuario existente - actualizar avatar si no tiene
      if (!user.avatar && googleUser.avatar) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { avatar: googleUser.avatar },
        });
        user.avatar = googleUser.avatar;
      }

      // Verificar si el usuario no está verificado (por si registro manual previo)
      if (!user.verified) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { verified: true },
        });
        user.verified = true;
      }

      this.log(`Google login successful for existing user: ${user.email}`);
    } else {
      // Crear nuevo usuario
      const randomPassword = uuidv4(); // Password aleatorio (el usuario no lo necesitará)
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: googleUser.email,
            password: hashedPassword,
            name: googleUser.name,
            avatar: googleUser.avatar,
            verified: true, // Google ya verificó el email
          },
        });

        // Crear wallet
        await tx.wallet.create({
          data: {
            userId: newUser.id,
            balance: 0,
          },
        });

        return newUser;
      });

      this.log(`New user created via Google: ${user.email}`);
    }

    // Generar JWT
    const payload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar ?? undefined,
        verified: user.verified,
        city: user.city ?? undefined,
        age: user.age ?? undefined,
        bio: user.bio ?? undefined,
        hasPartner: user.hasPartner ?? undefined,
        hasChildren: user.hasChildren ?? undefined,
        childrenAges: user.childrenAges ?? undefined,
      },
    };
  }
}
