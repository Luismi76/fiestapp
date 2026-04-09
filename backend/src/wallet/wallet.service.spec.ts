import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from './wallet.service';
import { ConfigService } from '@nestjs/config';
import { StripeIdempotencyService } from '../common/stripe-idempotency.service';
import { PlatformConfigService } from '../platform-config/platform-config.service';

// Mock Stripe to prevent real API calls
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn(),
        retrieve: jest.fn(),
      },
    },
  }));
});

describe('WalletService', () => {
  let service: WalletService;

  const mockPrismaService = {
    wallet: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    transaction: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        FRONTEND_URL: 'http://localhost:3000',
        STRIPE_SECRET_KEY: 'sk_test_fake',
      };
      return config[key];
    }),
  };

  const mockStripeIdempotency = {
    isAlreadyProcessed: jest.fn(),
  };

  const mockPlatformConfig = {
    platformFee: 1.5,
    minTopup: 4.5,
    calculateStripeFee: jest.fn().mockReturnValue(0.28),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: StripeIdempotencyService, useValue: mockStripeIdempotency },
        { provide: PlatformConfigService, useValue: mockPlatformConfig },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getWallet', () => {
    const userId = 'user-1';

    it('should return existing wallet', async () => {
      const wallet = { id: 'wallet-1', userId, balance: 10 };
      mockPrismaService.wallet.findUnique.mockResolvedValue(wallet);

      const result = await service.getWallet(userId);

      expect(result).toEqual(wallet);
      expect(mockPrismaService.wallet.findUnique).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it('should create wallet if it does not exist', async () => {
      const newWallet = { id: 'wallet-new', userId, balance: 0 };
      mockPrismaService.wallet.findUnique.mockResolvedValue(null);
      mockPrismaService.wallet.create.mockResolvedValue(newWallet);

      const result = await service.getWallet(userId);

      expect(result).toEqual(newWallet);
      expect(mockPrismaService.wallet.create).toHaveBeenCalledWith({
        data: { userId, balance: 0 },
      });
    });
  });

  describe('getBalance', () => {
    it('should return wallet balance', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'w1',
        userId: 'user-1',
        balance: 25.5,
      });

      const balance = await service.getBalance('user-1');

      expect(balance).toBe(25.5);
    });

    it('should return 0 for a new wallet', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(null);
      mockPrismaService.wallet.create.mockResolvedValue({
        id: 'w1',
        userId: 'user-1',
        balance: 0,
      });

      const balance = await service.getBalance('user-1');

      expect(balance).toBe(0);
    });
  });

  describe('hasEnoughBalance', () => {
    it('should return true when balance is sufficient', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'w1',
        userId: 'user-1',
        balance: 10,
      });

      const result = await service.hasEnoughBalance('user-1');

      // Default amount is platformFee (1.5)
      expect(result).toBe(true);
    });

    it('should return false when balance is insufficient', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'w1',
        userId: 'user-1',
        balance: 0.5,
      });

      const result = await service.hasEnoughBalance('user-1');

      expect(result).toBe(false);
    });

    it('should check against custom amount', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'w1',
        userId: 'user-1',
        balance: 5,
      });

      const resultEnough = await service.hasEnoughBalance('user-1', 3);
      expect(resultEnough).toBe(true);

      const resultNotEnough = await service.hasEnoughBalance('user-1', 10);
      expect(resultNotEnough).toBe(false);
    });
  });

  describe('addBalance', () => {
    it('should throw BadRequestException for non-positive amount', async () => {
      await expect(service.addBalance('user-1', 0, 'test')).rejects.toThrow(
        BadRequestException,
      );

      await expect(service.addBalance('user-1', -5, 'test')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should add balance via transaction', async () => {
      mockPrismaService.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => {
          const mockTx = {
            wallet: {
              upsert: jest.fn().mockResolvedValue({ balance: 15 }),
            },
            transaction: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockTx);
        },
      );

      await service.addBalance('user-1', 10, 'Reembolso test', 'match-1');

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('deductPlatformFee', () => {
    it('should throw BadRequestException if balance is insufficient', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'w1',
        userId: 'user-1',
        balance: 0.5,
      });

      await expect(
        service.deductPlatformFee(
          'user-1',
          'match-1',
          'Experiencia Test',
          'host',
          'user-2',
          'Other User',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should deduct fee successfully', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'w1',
        userId: 'user-1',
        balance: 10,
      });

      mockPrismaService.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => {
          const mockTx = {
            wallet: {
              update: jest.fn().mockResolvedValue({ balance: 8.5 }),
            },
            transaction: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockTx);
        },
      );

      await service.deductPlatformFee(
        'user-1',
        'match-1',
        'Fallas de Valencia',
        'host',
        'user-2',
        'Viajero',
      );

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('refundPlatformFee', () => {
    it('should not refund if no fee was charged', async () => {
      mockPrismaService.transaction.findFirst.mockResolvedValue(null);

      await service.refundPlatformFee('user-1', 'match-1');

      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should not refund if already refunded', async () => {
      // First call: find the charged fee
      mockPrismaService.transaction.findFirst
        .mockResolvedValueOnce({ id: 'tx-1', type: 'platform_fee' })
        // Second call: find existing refund
        .mockResolvedValueOnce({ id: 'tx-refund' });

      await service.refundPlatformFee('user-1', 'match-1');

      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should refund fee when eligible', async () => {
      mockPrismaService.transaction.findFirst
        .mockResolvedValueOnce({ id: 'tx-1', type: 'platform_fee' })
        .mockResolvedValueOnce(null); // No prior refund

      mockPrismaService.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => {
          const mockTx = {
            wallet: {
              update: jest.fn().mockResolvedValue({}),
            },
            transaction: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockTx);
        },
      );

      await service.refundPlatformFee('user-1', 'match-1');

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('createTopUpSession', () => {
    it('should throw BadRequestException for amount below minimum', async () => {
      await expect(service.createTopUpSession('user-1', 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.createTopUpSession('user-1', 10)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTransactionHistory', () => {
    it('should return paginated transactions', async () => {
      const transactions = [
        {
          id: 'tx-1',
          type: 'topup',
          amount: 10,
          status: 'completed',
          otherUserId: null,
        },
      ];
      mockPrismaService.transaction.findMany.mockResolvedValue(transactions);
      mockPrismaService.transaction.count.mockResolvedValue(1);
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.getTransactionHistory('user-1', 1, 20);

      expect(result.transactions).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
    });

    it('should filter by transaction type', async () => {
      mockPrismaService.transaction.findMany.mockResolvedValue([]);
      mockPrismaService.transaction.count.mockResolvedValue(0);
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.getTransactionHistory(
        'user-1',
        1,
        20,
        'topup',
      );

      expect(result.transactions).toHaveLength(0);
      // Verify that the where clause includes the type filter
      // prettier-ignore
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const findManyCall = mockPrismaService.transaction.findMany.mock.calls[0][0];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(findManyCall.where.type).toBe('topup');
    });

    it('should enrich transactions with other user data', async () => {
      const transactions = [
        {
          id: 'tx-1',
          type: 'platform_fee',
          amount: -1.5,
          status: 'completed',
          otherUserId: 'user-2',
        },
      ];
      const otherUsers = [{ id: 'user-2', name: 'Other User', avatar: null }];
      mockPrismaService.transaction.findMany.mockResolvedValue(transactions);
      mockPrismaService.transaction.count.mockResolvedValue(1);
      mockPrismaService.user.findMany.mockResolvedValue(otherUsers);

      const result = await service.getTransactionHistory(
        'user-1',
        1,
        20,
        'platform_fee',
      );

      expect(result.transactions[0].otherUser).toEqual(otherUsers[0]);
    });
  });
});
