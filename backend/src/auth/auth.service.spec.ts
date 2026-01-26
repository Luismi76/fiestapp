import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Mock dependencies before importing AuthService
jest.mock('../email/email.service');
jest.mock('bcrypt', () => ({
  hash: jest.fn(() => Promise.resolve('hashedPassword')),
  compare: jest.fn(() => Promise.resolve(true)),
}));
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-v4'),
}));
jest.mock('otplib', () => ({
  verifySync: jest.fn(() => ({ valid: true })),
}));
jest.mock('fs', () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const actual = jest.requireActual('fs');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    ...actual,
    appendFileSync: jest.fn(),
  };
});

// Import after mocks
import { AuthService } from './auth.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let _prismaService: PrismaService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let _jwtService: JwtService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let _emailService: EmailService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    wallet: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    _prismaService = module.get<PrismaService>(PrismaService);
    _jwtService = module.get<JwtService>(JwtService);
    _emailService = module.get<EmailService>(EmailService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'Password123!',
      name: 'Test User',
    };

    it('should throw UnauthorizedException if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '1',
        email: registerDto.email,
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
    });

    it('should create user and wallet in transaction', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      const newUser = {
        id: '1',
        email: registerDto.email,
        name: registerDto.name,
      };

      mockPrismaService.$transaction.mockImplementation((callback: any) => {
        const mockTx = {
          user: {
            create: jest.fn().mockResolvedValue(newUser),
          },
          wallet: {
            create: jest
              .fn()
              .mockResolvedValue({ id: '1', userId: newUser.id }),
          },
        };
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
        return callback(mockTx);
      });
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await service.register(registerDto);

      expect(result.email).toBe(registerDto.email);
      expect(result.message).toContain('Registro exitoso');
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '1',
        email: loginDto.email,
        password: 'hashedPassword',
        verified: true,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user is banned', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '1',
        email: loginDto.email,
        password: 'hashedPassword',
        verified: true,
        bannedAt: new Date(),
        banReason: 'Test ban',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(
        'Tu cuenta ha sido suspendida',
      );
    });

    it('should throw UnauthorizedException if email not verified', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '1',
        email: loginDto.email,
        password: 'hashedPassword',
        verified: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(
        'Por favor, verifica tu email',
      );
    });

    it('should return access token for valid credentials', async () => {
      const user = {
        id: '1',
        email: loginDto.email,
        password: 'hashedPassword',
        name: 'Test User',
        verified: true,
        avatar: null,
        twoFactorEnabled: false,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('access_token', 'jwt-token');
      expect(result).toHaveProperty('user');

      expect((result as { user: { email: string } }).user.email).toBe(
        loginDto.email,
      );
    });

    it('should require 2FA if enabled', async () => {
      const user = {
        id: '1',
        email: loginDto.email,
        password: 'hashedPassword',
        name: 'Test User',
        verified: true,
        twoFactorEnabled: true,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('temp-token');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('requiresTwoFactor', true);
      expect(result).toHaveProperty('tempToken');
    });
  });

  describe('verifyEmail', () => {
    it('should throw BadRequestException if token is invalid', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if token is expired', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        emailVerificationExpires: new Date(Date.now() - 1000), // Expired
        verified: false,
      });

      await expect(service.verifyEmail('expired-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return success message if already verified', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        emailVerificationExpires: new Date(Date.now() + 1000),
        verified: true,
      });

      const result = await service.verifyEmail('valid-token');

      expect(result.message).toContain('ya ha sido verificado');
    });

    it('should verify email successfully', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        emailVerificationExpires: new Date(Date.now() + 1000),
        verified: false,
      });
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.verifyEmail('valid-token');

      expect(result.message).toContain('verificado correctamente');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          verified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
        },
      });
    });
  });

  describe('forgotPassword', () => {
    it('should return success message even if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword('nonexistent@example.com');

      expect(result.message).toContain('Si el email existe');
    });

    it('should send reset email for existing user', async () => {
      const user = { id: '1', email: 'test@example.com', name: 'Test' };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.user.update.mockResolvedValue({});
      mockEmailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await service.forgotPassword('test@example.com');

      expect(result.message).toContain('Si el email existe');
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should throw BadRequestException if token is invalid', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.resetPassword('invalid-token', 'NewPassword123!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if token is expired', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        passwordResetExpires: new Date(Date.now() - 1000),
      });

      await expect(
        service.resetPassword('expired-token', 'NewPassword123!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reset password successfully', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        passwordResetExpires: new Date(Date.now() + 1000),
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.resetPassword(
        'valid-token',
        'NewPassword123!',
      );

      expect(result.message).toContain('actualizada correctamente');
      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });
  });

  describe('validateUser', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.validateUser('invalid-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return user data for valid id', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        avatar: null,
        verified: true,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await service.validateUser('1');

      expect(result).toEqual(user);
    });
  });
});
