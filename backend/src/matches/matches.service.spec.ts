import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchesService } from './matches.service';
import { WalletService } from '../wallet/wallet.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PushService } from '../notifications/push.service';
import { PricingService } from '../experiences/pricing.service';
import { CancellationsService } from '../cancellations/cancellations.service';
import { EmailService } from '../email/email.service';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { ConfigService } from '@nestjs/config';
import { StripeIdempotencyService } from '../common/stripe-idempotency.service';
import { ConnectService } from '../connect/connect.service';

describe('MatchesService', () => {
  let service: MatchesService;

  const mockPrismaService = {
    experience: {
      findUnique: jest.fn(),
    },
    match: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    message: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockWalletService = {
    hasEnoughCredits: jest.fn(),
    getWallet: jest.fn(),
    deductPlatformFee: jest.fn(),
    refundPlatformFee: jest.fn(),
  };

  const mockUsersService = {
    hasBlockBetweenUsers: jest.fn(),
  };

  const mockNotificationsService = {
    notifyMatchRequest: jest.fn().mockResolvedValue(undefined),
    notifyMatchAccepted: jest.fn().mockResolvedValue(undefined),
    notifyMatchRejected: jest.fn().mockResolvedValue(undefined),
    notifyWalletCharged: jest.fn().mockResolvedValue(undefined),
    notifyLowBalance: jest.fn().mockResolvedValue(undefined),
  };

  const mockPushService = {
    pushMatchRequest: jest.fn().mockResolvedValue(undefined),
    pushMatchAccepted: jest.fn().mockResolvedValue(undefined),
    pushWalletCharged: jest.fn().mockResolvedValue(undefined),
    pushLowBalance: jest.fn().mockResolvedValue(undefined),
  };

  const mockPricingService = {
    calculateGroupPrice: jest.fn(),
  };

  const mockCancellationsService = {
    getAvailablePolicies: jest.fn(),
    checkCancellationWarning: jest.fn(),
    recordCancellation: jest.fn(),
  };

  const mockEmailService = {
    sendMatchCancelledEmail: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockStripeIdempotency = {
    isAlreadyProcessed: jest.fn(),
  };

  const mockPlatformConfig = {
    platformFee: 1.5,
    calculateStripeFee: jest.fn().mockReturnValue(0.28),
  };

  const mockConnectService = {
    createTransferToHost: jest.fn(),
    getAccountStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: PushService, useValue: mockPushService },
        { provide: PricingService, useValue: mockPricingService },
        { provide: CancellationsService, useValue: mockCancellationsService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: StripeIdempotencyService, useValue: mockStripeIdempotency },
        { provide: PlatformConfigService, useValue: mockPlatformConfig },
        { provide: ConnectService, useValue: mockConnectService },
      ],
    }).compile();

    service = module.get<MatchesService>(MatchesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const requesterId = 'requester-1';
    const hostId = 'host-1';
    const experienceId = 'exp-1';
    const createDto = { experienceId };

    const mockExperience = {
      id: experienceId,
      hostId,
      published: true,
      type: 'intercambio',
      title: 'Fallas de Valencia',
      minParticipants: null,
      maxParticipants: null,
      host: { id: hostId, name: 'Host User' },
    };

    it('should throw NotFoundException if experience does not exist', async () => {
      mockPrismaService.experience.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto, requesterId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if experience is not published', async () => {
      mockPrismaService.experience.findUnique
        .mockResolvedValueOnce({ ...mockExperience, published: false })
        .mockResolvedValueOnce({ capacity: 1 });

      await expect(service.create(createDto, requesterId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if requesting own experience', async () => {
      mockPrismaService.experience.findUnique
        .mockResolvedValueOnce(mockExperience)
        .mockResolvedValueOnce({ capacity: 1 });

      await expect(service.create(createDto, hostId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException if users have a block', async () => {
      mockPrismaService.experience.findUnique
        .mockResolvedValueOnce(mockExperience)
        .mockResolvedValueOnce({ capacity: 1 });
      mockUsersService.hasBlockBetweenUsers.mockResolvedValue(true);

      await expect(service.create(createDto, requesterId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ConflictException if active match already exists', async () => {
      mockPrismaService.experience.findUnique
        .mockResolvedValueOnce(mockExperience)
        .mockResolvedValueOnce({ capacity: 1 });
      mockUsersService.hasBlockBetweenUsers.mockResolvedValue(false);
      mockPrismaService.match.findUnique.mockResolvedValue({
        id: 'existing-match',
        status: 'pending',
      });

      await expect(service.create(createDto, requesterId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create a new match successfully', async () => {
      const createdMatch = {
        id: 'match-1',
        experienceId,
        requesterId,
        hostId,
        status: 'pending',
        experience: { ...mockExperience, festival: null },
        requester: {
          id: requesterId,
          name: 'Requester',
          avatar: null,
          verified: true,
          city: 'Madrid',
        },
        host: {
          id: hostId,
          name: 'Host User',
          avatar: null,
          verified: true,
        },
      };

      mockPrismaService.experience.findUnique
        .mockResolvedValueOnce(mockExperience)
        .mockResolvedValueOnce({ capacity: 5 });
      mockUsersService.hasBlockBetweenUsers.mockResolvedValue(false);
      // No existing match
      mockPrismaService.match.findUnique.mockResolvedValue(null);
      mockPrismaService.match.findMany.mockResolvedValue([]); // No overlapping matches
      mockPrismaService.match.create.mockResolvedValue(createdMatch);

      const result = await service.create(createDto, requesterId);

      expect(result.id).toBe('match-1');
      expect(result.status).toBe('pending');
      expect(mockPrismaService.match.create).toHaveBeenCalled();
      expect(mockNotificationsService.notifyMatchRequest).toHaveBeenCalledWith(
        hostId,
        'match-1',
        'Requester',
        'Fallas de Valencia',
      );
    });

    it('should reactivate a completed match instead of creating a new one', async () => {
      const existingMatch = {
        id: 'existing-match',
        status: 'completed',
      };
      const reactivatedMatch = {
        id: 'existing-match',
        status: 'pending',
        experience: { ...mockExperience, festival: null },
        requester: {
          id: requesterId,
          name: 'Requester',
          avatar: null,
          verified: true,
          city: 'Madrid',
        },
        host: {
          id: hostId,
          name: 'Host User',
          avatar: null,
          verified: true,
        },
      };

      mockPrismaService.experience.findUnique
        .mockResolvedValueOnce(mockExperience)
        .mockResolvedValueOnce({ capacity: 1 });
      mockUsersService.hasBlockBetweenUsers.mockResolvedValue(false);
      mockPrismaService.match.findUnique.mockResolvedValue(existingMatch);
      mockPrismaService.match.update.mockResolvedValue(reactivatedMatch);

      const result = await service.create(createDto, requesterId);

      expect(result.id).toBe('existing-match');
      expect(result.status).toBe('pending');
      expect(mockPrismaService.match.update).toHaveBeenCalled();
    });
  });

  describe('accept', () => {
    const matchId = 'match-1';
    const hostId = 'host-1';
    const requesterId = 'requester-1';

    const mockMatch = {
      id: matchId,
      hostId,
      requesterId,
      status: 'pending',
      totalPrice: null,
      experience: { title: 'Fallas de Valencia' },
      host: { name: 'Host User' },
      requester: { name: 'Requester User' },
    };

    it('should throw NotFoundException if match does not exist', async () => {
      mockPrismaService.match.findUnique.mockResolvedValue(null);

      await expect(service.accept(matchId, hostId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if caller is not the host', async () => {
      mockPrismaService.match.findUnique.mockResolvedValue(mockMatch);

      await expect(service.accept(matchId, 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if match is not pending', async () => {
      mockPrismaService.match.findUnique.mockResolvedValue({
        ...mockMatch,
        status: 'accepted',
      });

      await expect(service.accept(matchId, hostId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if host has insufficient balance', async () => {
      mockPrismaService.match.findUnique.mockResolvedValue(mockMatch);
      mockWalletService.hasEnoughCredits
        .mockResolvedValueOnce(false) // host
        .mockResolvedValueOnce(true); // requester

      await expect(service.accept(matchId, hostId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if requester has insufficient balance', async () => {
      mockPrismaService.match.findUnique.mockResolvedValue(mockMatch);
      mockWalletService.hasEnoughCredits
        .mockResolvedValueOnce(true) // host
        .mockResolvedValueOnce(false); // requester

      await expect(service.accept(matchId, hostId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should accept match and deduct platform fee from both users', async () => {
      mockPrismaService.match.findUnique.mockResolvedValue(mockMatch);
      mockWalletService.hasEnoughCredits.mockResolvedValue(true);
      mockWalletService.deductPlatformFee.mockResolvedValue(undefined);
      mockWalletService.getWallet.mockResolvedValue({ balance: 10 });

      const updatedMatch = { ...mockMatch, status: 'accepted' };
      mockPrismaService.match.update.mockResolvedValue(updatedMatch);

      const result = await service.accept(matchId, hostId);

      expect(result.status).toBe('accepted');
      expect(mockWalletService.deductPlatformFee).toHaveBeenCalledTimes(2);
      expect(mockNotificationsService.notifyMatchAccepted).toHaveBeenCalledWith(
        requesterId,
        matchId,
        'Host User',
        'Fallas de Valencia',
      );
    });
  });

  describe('reject', () => {
    const matchId = 'match-1';
    const hostId = 'host-1';
    const requesterId = 'requester-1';

    const mockMatch = {
      id: matchId,
      hostId,
      requesterId,
      status: 'pending',
      experience: { title: 'Fallas de Valencia' },
    };

    it('should throw NotFoundException if match does not exist', async () => {
      mockPrismaService.match.findUnique.mockResolvedValue(null);

      await expect(service.reject(matchId, hostId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if caller is not the host', async () => {
      mockPrismaService.match.findUnique.mockResolvedValue(mockMatch);

      await expect(service.reject(matchId, requesterId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if match is not pending', async () => {
      mockPrismaService.match.findUnique.mockResolvedValue({
        ...mockMatch,
        status: 'accepted',
      });

      await expect(service.reject(matchId, hostId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject a pending match successfully', async () => {
      mockPrismaService.match.findUnique.mockResolvedValue(mockMatch);
      const updatedMatch = { ...mockMatch, status: 'rejected' };
      mockPrismaService.match.update.mockResolvedValue(updatedMatch);

      const result = await service.reject(matchId, hostId);

      expect(result.status).toBe('rejected');
      expect(mockNotificationsService.notifyMatchRejected).toHaveBeenCalledWith(
        requesterId,
        matchId,
        'Fallas de Valencia',
      );
    });
  });

  describe('complete', () => {
    const matchId = 'match-1';
    const hostId = 'host-1';

    it('should throw NotFoundException if match does not exist', async () => {
      mockPrismaService.match.findUnique.mockResolvedValue(null);

      await expect(service.complete(matchId, hostId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if caller is not the host', async () => {
      mockPrismaService.match.findUnique.mockResolvedValue({
        id: matchId,
        hostId,
        status: 'accepted',
      });

      await expect(service.complete(matchId, 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if match is not accepted', async () => {
      mockPrismaService.match.findUnique.mockResolvedValue({
        id: matchId,
        hostId,
        status: 'pending',
      });

      await expect(service.complete(matchId, hostId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if experience date is in the future', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      mockPrismaService.match.findUnique.mockResolvedValue({
        id: matchId,
        hostId,
        status: 'accepted',
        startDate: futureDate,
      });

      await expect(service.complete(matchId, hostId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should complete a match when date has passed', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 2);

      mockPrismaService.match.findUnique.mockResolvedValue({
        id: matchId,
        hostId,
        status: 'accepted',
        startDate: pastDate,
      });

      const updatedMatch = { id: matchId, status: 'completed' };
      mockPrismaService.match.update.mockResolvedValue(updatedMatch);

      const result = await service.complete(matchId, hostId);

      expect(result.status).toBe('completed');
    });

    it('should complete a match with no start date', async () => {
      mockPrismaService.match.findUnique.mockResolvedValue({
        id: matchId,
        hostId,
        status: 'accepted',
        startDate: null,
      });

      const updatedMatch = { id: matchId, status: 'completed' };
      mockPrismaService.match.update.mockResolvedValue(updatedMatch);

      const result = await service.complete(matchId, hostId);

      expect(result.status).toBe('completed');
    });
  });

  describe('findOne', () => {
    const matchId = 'match-1';
    const hostId = 'host-1';
    const requesterId = 'requester-1';

    it('should throw NotFoundException if match does not exist', async () => {
      mockPrismaService.match.findUnique.mockResolvedValue(null);

      await expect(service.findOne(matchId, hostId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not part of match', async () => {
      mockPrismaService.match.findUnique.mockResolvedValue({
        id: matchId,
        hostId,
        requesterId,
      });

      await expect(service.findOne(matchId, 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return match and mark messages as read', async () => {
      const match = {
        id: matchId,
        hostId,
        requesterId,
        messages: [],
      };
      mockPrismaService.match.findUnique.mockResolvedValue(match);
      mockPrismaService.message.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.findOne(matchId, hostId);

      expect(result.id).toBe(matchId);
      expect(mockPrismaService.message.updateMany).toHaveBeenCalled();
    });
  });
});
