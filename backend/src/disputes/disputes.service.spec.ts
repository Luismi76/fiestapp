import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DisputesService } from './disputes.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { AuditService } from '../audit/audit.service';

describe('DisputesService', () => {
  let service: DisputesService;

  const mockPrismaService = {
    match: {
      findUnique: jest.fn(),
    },
    dispute: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    disputeMessage: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockWalletService = {
    addBalance: jest.fn().mockResolvedValue(undefined),
  };

  const mockNotificationsService = {
    create: jest.fn().mockResolvedValue(undefined),
  };

  const mockEmailService = {
    sendDisputeOpenedEmail: jest.fn().mockResolvedValue(undefined),
    sendDisputeResolvedEmail: jest.fn().mockResolvedValue(undefined),
    sendDisputeMessageEmail: jest.fn().mockResolvedValue(undefined),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
    logAdminAction: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<DisputesService>(DisputesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('openDispute', () => {
    const userId = 'user-1';
    const dto = {
      matchId: 'match-1',
      reason: 'NO_SHOW' as const,
      description: 'El anfitrion no aparecio',
    };

    const mockMatch = {
      id: 'match-1',
      hostId: 'host-1',
      requesterId: 'user-1',
      status: 'accepted',
      experience: { title: 'Fallas de Valencia', city: 'Valencia' },
      host: { id: 'host-1', name: 'Host User', email: 'host@test.com' },
      requester: {
        id: 'user-1',
        name: 'Requester User',
        email: 'req@test.com',
      },
    };

    it('should throw NotFoundException if match does not exist', async () => {
      mockPrismaService.match.findUnique.mockResolvedValue(null);

      await expect(service.openDispute(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not part of match', async () => {
      mockPrismaService.match.findUnique.mockResolvedValue(mockMatch);

      await expect(
        service.openDispute('other-user', dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if match status is not accepted or completed', async () => {
      mockPrismaService.match.findUnique.mockResolvedValue({
        ...mockMatch,
        status: 'pending',
      });

      await expect(service.openDispute(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if active dispute already exists', async () => {
      mockPrismaService.match.findUnique.mockResolvedValue(mockMatch);
      mockPrismaService.dispute.findFirst.mockResolvedValue({
        id: 'dispute-existing',
        status: 'OPEN',
      });

      await expect(service.openDispute(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if dispute limit reached', async () => {
      mockPrismaService.match.findUnique.mockResolvedValue(mockMatch);
      mockPrismaService.dispute.findFirst.mockResolvedValue(null);
      mockPrismaService.dispute.count.mockResolvedValue(3); // MAX_DISPUTES_PER_MATCH = 3

      await expect(service.openDispute(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create dispute successfully as requester', async () => {
      mockPrismaService.match.findUnique.mockResolvedValue(mockMatch);
      mockPrismaService.dispute.findFirst.mockResolvedValue(null);
      mockPrismaService.dispute.count.mockResolvedValue(0);

      const createdDispute = {
        id: 'dispute-1',
        matchId: 'match-1',
        openedById: userId,
        respondentId: 'host-1',
        reason: 'NO_SHOW',
        description: dto.description,
        status: 'OPEN',
        openedBy: { id: userId, name: 'Requester User', email: 'req@test.com' },
        respondent: {
          id: 'host-1',
          name: 'Host User',
          email: 'host@test.com',
        },
        match: {
          experience: { title: 'Fallas de Valencia', city: 'Valencia' },
        },
      };
      mockPrismaService.dispute.create.mockResolvedValue(createdDispute);

      const result = await service.openDispute(userId, dto);

      expect(result.id).toBe('dispute-1');
      expect(result.respondentId).toBe('host-1');
      expect(mockAuditService.log).toHaveBeenCalled();
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'host-1',
          type: 'dispute_opened',
        }),
      );
      expect(mockEmailService.sendDisputeOpenedEmail).toHaveBeenCalledTimes(2);
    });

    it('should create dispute as host (respondent is requester)', async () => {
      const hostId = 'host-1';
      mockPrismaService.match.findUnique.mockResolvedValue(mockMatch);
      mockPrismaService.dispute.findFirst.mockResolvedValue(null);
      mockPrismaService.dispute.count.mockResolvedValue(0);

      const createdDispute = {
        id: 'dispute-2',
        matchId: 'match-1',
        openedById: hostId,
        respondentId: 'user-1',
        reason: 'NO_SHOW',
        description: dto.description,
        status: 'OPEN',
        openedBy: { id: hostId, name: 'Host User', email: 'host@test.com' },
        respondent: {
          id: 'user-1',
          name: 'Requester User',
          email: 'req@test.com',
        },
        match: {
          experience: { title: 'Fallas de Valencia', city: 'Valencia' },
        },
      };
      mockPrismaService.dispute.create.mockResolvedValue(createdDispute);

      const result = await service.openDispute(hostId, dto);

      expect(result.respondentId).toBe('user-1');
    });
  });

  describe('resolveDispute', () => {
    const adminId = 'admin-1';
    const disputeId = 'dispute-1';

    const mockDispute = {
      id: disputeId,
      openedById: 'user-1',
      respondentId: 'host-1',
      matchId: 'match-1',
      status: 'OPEN',
      openedBy: { id: 'user-1', name: 'Requester', email: 'req@test.com' },
      respondent: { id: 'host-1', name: 'Host', email: 'host@test.com' },
      match: {
        totalPrice: 50,
        requesterId: 'user-1',
        experience: { title: 'Fallas de Valencia' },
        requester: { id: 'user-1' },
      },
    };

    it('should throw ForbiddenException if user is not admin', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'user',
        name: 'Regular User',
      });

      await expect(
        service.resolveDispute(adminId, disputeId, {
          resolution: 'RESOLVED_NO_REFUND',
          resolutionDescription: 'No procede reembolso',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if dispute does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'admin',
        name: 'Admin',
      });
      mockPrismaService.dispute.findUnique.mockResolvedValue(null);

      await expect(
        service.resolveDispute(adminId, disputeId, {
          resolution: 'RESOLVED_NO_REFUND',
          resolutionDescription: 'No procede',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if dispute is already resolved', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'admin',
        name: 'Admin',
      });
      mockPrismaService.dispute.findUnique.mockResolvedValue({
        ...mockDispute,
        status: 'RESOLVED_REFUND',
      });

      await expect(
        service.resolveDispute(adminId, disputeId, {
          resolution: 'RESOLVED_NO_REFUND',
          resolutionDescription: 'Already done',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should resolve with full refund', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'admin',
        name: 'Admin',
      });
      mockPrismaService.dispute.findUnique.mockResolvedValue(mockDispute);

      const updatedDispute = {
        ...mockDispute,
        status: 'RESOLVED_REFUND',
        refundAmount: 50,
        refundPercentage: 100,
      };
      mockPrismaService.dispute.update.mockResolvedValue(updatedDispute);

      const result = await service.resolveDispute(adminId, disputeId, {
        resolution: 'RESOLVED_REFUND',
        resolutionDescription: 'Reembolso completo concedido',
      });

      expect(result.status).toBe('RESOLVED_REFUND');
      // Default refund goes to requester
      expect(mockWalletService.addBalance).toHaveBeenCalledWith(
        'user-1',
        50,
        expect.stringContaining('Reembolso'),
        'match-1',
      );
      expect(mockNotificationsService.create).toHaveBeenCalledTimes(2);
      expect(mockEmailService.sendDisputeResolvedEmail).toHaveBeenCalledTimes(
        2,
      );
      expect(mockAuditService.logAdminAction).toHaveBeenCalled();
    });

    it('should resolve with partial refund', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'admin',
        name: 'Admin',
      });
      mockPrismaService.dispute.findUnique.mockResolvedValue(mockDispute);

      const updatedDispute = {
        ...mockDispute,
        status: 'RESOLVED_PARTIAL_REFUND',
        refundAmount: 25,
        refundPercentage: 50,
      };
      mockPrismaService.dispute.update.mockResolvedValue(updatedDispute);

      await service.resolveDispute(adminId, disputeId, {
        resolution: 'RESOLVED_PARTIAL_REFUND',
        resolutionDescription: 'Reembolso parcial del 50%',
        refundPercentage: 50,
      });

      expect(mockWalletService.addBalance).toHaveBeenCalledWith(
        'user-1',
        25,
        expect.any(String),
        'match-1',
      );
    });

    it('should resolve with no refund', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'admin',
        name: 'Admin',
      });
      mockPrismaService.dispute.findUnique.mockResolvedValue(mockDispute);

      const updatedDispute = {
        ...mockDispute,
        status: 'RESOLVED_NO_REFUND',
        refundAmount: 0,
        refundPercentage: 0,
      };
      mockPrismaService.dispute.update.mockResolvedValue(updatedDispute);

      await service.resolveDispute(adminId, disputeId, {
        resolution: 'RESOLVED_NO_REFUND',
        resolutionDescription: 'No procede reembolso',
      });

      // addBalance should NOT be called when refundAmount is 0
      expect(mockWalletService.addBalance).not.toHaveBeenCalled();
    });

    it('should refund to favored party (opener)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'admin',
        name: 'Admin',
      });
      mockPrismaService.dispute.findUnique.mockResolvedValue(mockDispute);

      const updatedDispute = {
        ...mockDispute,
        status: 'RESOLVED_REFUND',
      };
      mockPrismaService.dispute.update.mockResolvedValue(updatedDispute);

      await service.resolveDispute(adminId, disputeId, {
        resolution: 'RESOLVED_REFUND',
        resolutionDescription: 'A favor del denunciante',
        favoredParty: 'opener',
      });

      // Opener is user-1 (openedById)
      expect(mockWalletService.addBalance).toHaveBeenCalledWith(
        'user-1',
        50,
        expect.any(String),
        'match-1',
      );
    });

    it('should refund to favored party (respondent)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'admin',
        name: 'Admin',
      });
      mockPrismaService.dispute.findUnique.mockResolvedValue(mockDispute);

      const updatedDispute = {
        ...mockDispute,
        status: 'RESOLVED_REFUND',
      };
      mockPrismaService.dispute.update.mockResolvedValue(updatedDispute);

      await service.resolveDispute(adminId, disputeId, {
        resolution: 'RESOLVED_REFUND',
        resolutionDescription: 'A favor del demandado',
        favoredParty: 'respondent',
      });

      // Respondent is host-1
      expect(mockWalletService.addBalance).toHaveBeenCalledWith(
        'host-1',
        50,
        expect.any(String),
        'match-1',
      );
    });
  });

  describe('getReasonDescription', () => {
    it('should return readable description for each reason', () => {
      expect(service.getReasonDescription('NO_SHOW' as any)).toContain(
        'no se present',
      );
      expect(
        service.getReasonDescription('EXPERIENCE_MISMATCH' as any),
      ).toContain('no coincid');
      expect(
        service.getReasonDescription('SAFETY_CONCERN' as any),
      ).toContain('seguridad');
      expect(service.getReasonDescription('PAYMENT_ISSUE' as any)).toContain(
        'pago',
      );
      expect(service.getReasonDescription('OTHER' as any)).toContain(
        'Otro',
      );
    });
  });

  describe('markUnderReview', () => {
    it('should throw ForbiddenException if not admin', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ role: 'user' });

      await expect(
        service.markUnderReview('user-1', 'dispute-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if dispute not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ role: 'admin' });
      mockPrismaService.dispute.findUnique.mockResolvedValue(null);

      await expect(
        service.markUnderReview('admin-1', 'dispute-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if dispute is not OPEN', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ role: 'admin' });
      mockPrismaService.dispute.findUnique.mockResolvedValue({
        id: 'dispute-1',
        status: 'UNDER_REVIEW',
      });

      await expect(
        service.markUnderReview('admin-1', 'dispute-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should mark dispute as under review', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ role: 'admin' });
      mockPrismaService.dispute.findUnique.mockResolvedValue({
        id: 'dispute-1',
        status: 'OPEN',
      });
      mockPrismaService.dispute.update.mockResolvedValue({
        id: 'dispute-1',
        status: 'UNDER_REVIEW',
      });

      const result = await service.markUnderReview('admin-1', 'dispute-1');

      expect(result.status).toBe('UNDER_REVIEW');
      expect(mockAuditService.logAdminAction).toHaveBeenCalled();
    });
  });

  describe('getActiveDisputeForMatch', () => {
    it('should throw NotFoundException if match not found', async () => {
      mockPrismaService.match.findUnique.mockResolvedValue(null);

      await expect(
        service.getActiveDisputeForMatch('user-1', 'match-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not part of match', async () => {
      mockPrismaService.match.findUnique.mockResolvedValue({
        hostId: 'host-1',
        requesterId: 'requester-1',
      });

      await expect(
        service.getActiveDisputeForMatch('other-user', 'match-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return active dispute for match', async () => {
      mockPrismaService.match.findUnique.mockResolvedValue({
        hostId: 'host-1',
        requesterId: 'user-1',
      });
      mockPrismaService.dispute.findFirst.mockResolvedValue({
        id: 'dispute-1',
        status: 'OPEN',
        reason: 'NO_SHOW',
        createdAt: new Date(),
      });

      const result = await service.getActiveDisputeForMatch(
        'user-1',
        'match-1',
      );

      expect(result.dispute).toBeDefined();
      expect(result.dispute!.id).toBe('dispute-1');
    });

    it('should return null dispute when no active dispute exists', async () => {
      mockPrismaService.match.findUnique.mockResolvedValue({
        hostId: 'host-1',
        requesterId: 'user-1',
      });
      mockPrismaService.dispute.findFirst.mockResolvedValue(null);

      const result = await service.getActiveDisputeForMatch(
        'user-1',
        'match-1',
      );

      expect(result.dispute).toBeNull();
    });
  });

  describe('getUserDisputes', () => {
    it('should return disputes for user', async () => {
      const disputes = [
        {
          id: 'dispute-1',
          status: 'OPEN',
          openedBy: { id: 'user-1', name: 'User 1', avatar: null },
          respondent: { id: 'host-1', name: 'Host 1', avatar: null },
          match: {
            experience: { id: 'exp-1', title: 'Test', city: 'Valencia' },
          },
          _count: { messages: 3 },
        },
      ];
      mockPrismaService.dispute.findMany.mockResolvedValue(disputes);

      const result = await service.getUserDisputes('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('dispute-1');
    });

    it('should filter by status', async () => {
      mockPrismaService.dispute.findMany.mockResolvedValue([]);

      await service.getUserDisputes('user-1', 'OPEN');

      const findManyCall = mockPrismaService.dispute.findMany.mock.calls[0][0];
      expect(findManyCall.where.status).toBe('OPEN');
    });
  });
});
