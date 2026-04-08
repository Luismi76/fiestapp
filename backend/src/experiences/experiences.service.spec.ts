import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExperiencesService } from './experiences.service';
import { CacheService } from '../cache/cache.service';
import { CancellationsService } from '../cancellations/cancellations.service';

// Mock global fetch for geocoding
global.fetch = jest.fn();

describe('ExperiencesService', () => {
  let service: ExperiencesService;

  const mockPrismaService = {
    festival: {
      findUnique: jest.fn(),
    },
    experience: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    experienceAvailability: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    review: {
      aggregate: jest.fn(),
    },
    match: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    getOrSet: jest.fn(),
    invalidateExperiences: jest.fn(),
    invalidateExperience: jest.fn(),
  };

  const mockCancellationsService = {
    getAvailablePolicies: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExperiencesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: CancellationsService, useValue: mockCancellationsService },
      ],
    }).compile();

    service = module.get<ExperiencesService>(ExperiencesService);

    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([{ lat: '39.4699', lon: '-0.3763' }]),
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const userId = 'user-1';
    const createDto = {
      title: 'Experiencia Fallas',
      description: 'Vive las Fallas desde dentro',
      city: 'Valencia',
      type: 'intercambio' as const,
      price: null,
      festivalId: 'festival-1',
      categoryId: 'cat-1',
    };

    it('should throw NotFoundException if festival does not exist', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto as any, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create an experience successfully', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue({
        id: 'festival-1',
        name: 'Fallas',
      });

      const createdExperience = {
        id: 'exp-1',
        ...createDto,
        hostId: userId,
        published: false,
        host: { id: userId, name: 'Test User', avatar: null, verified: true },
        festival: { id: 'festival-1', name: 'Fallas', city: 'Valencia', latitude: null, longitude: null },
        category: { id: 'cat-1', name: 'Gastronomia', slug: 'gastronomia', group: 'CULTURE', icon: null },
      };

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          const mockTx = {
            experience: {
              create: jest.fn().mockResolvedValue(createdExperience),
            },
            experienceAvailability: {
              createMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
          };
          return callback(mockTx);
        },
      );
      mockCacheService.invalidateExperiences.mockResolvedValue(undefined);

      const result = await service.create(createDto as any, userId);

      expect(result.id).toBe('exp-1');
      expect(result.title).toBe('Experiencia Fallas');
      expect(mockCacheService.invalidateExperiences).toHaveBeenCalled();
    });

    it('should create experience without festivalId', async () => {
      const dtoNoFestival = { ...createDto, festivalId: undefined };

      const createdExperience = {
        id: 'exp-2',
        ...dtoNoFestival,
        hostId: userId,
        host: { id: userId, name: 'Test User', avatar: null, verified: true },
        festival: null,
        category: { id: 'cat-1', name: 'Gastronomia', slug: 'gastronomia', group: 'CULTURE', icon: null },
      };

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          const mockTx = {
            experience: {
              create: jest.fn().mockResolvedValue(createdExperience),
            },
            experienceAvailability: {
              createMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
          };
          return callback(mockTx);
        },
      );
      mockCacheService.invalidateExperiences.mockResolvedValue(undefined);

      const result = await service.create(dtoNoFestival as any, userId);

      expect(result.id).toBe('exp-2');
      // Should not have looked up a festival
      expect(mockPrismaService.festival.findUnique).not.toHaveBeenCalled();
    });

    it('should create availability records when dates provided', async () => {
      const dtoWithDates = {
        ...createDto,
        festivalId: undefined,
        availability: ['2026-03-15', '2026-03-16', '2026-03-17'],
      };

      let createManyCalledWith: any = null;

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          const mockTx = {
            experience: {
              create: jest.fn().mockResolvedValue({
                id: 'exp-3',
                ...dtoWithDates,
                hostId: userId,
                host: { id: userId, name: 'Test User', avatar: null, verified: true },
                festival: null,
                category: null,
              }),
            },
            experienceAvailability: {
              createMany: jest.fn().mockImplementation((args) => {
                createManyCalledWith = args;
                return Promise.resolve({ count: 3 });
              }),
            },
          };
          return callback(mockTx);
        },
      );
      mockCacheService.invalidateExperiences.mockResolvedValue(undefined);

      await service.create(dtoWithDates as any, userId);

      expect(createManyCalledWith).not.toBeNull();
      expect(createManyCalledWith.data).toHaveLength(3);
      expect(createManyCalledWith.skipDuplicates).toBe(true);
    });
  });

  describe('findAll', () => {
    const mockExperiences = [
      {
        id: 'exp-1',
        title: 'Fallas Experience',
        city: 'Valencia',
        published: true,
        type: 'intercambio',
        createdAt: new Date(),
        host: { id: 'u1', name: 'Host', avatar: null, verified: true, hasPartner: false, hasChildren: false, childrenAges: [] },
        festival: { id: 'f1', name: 'Fallas', city: 'Valencia', latitude: null, longitude: null },
        category: null,
        _count: { reviews: 2, matches: 3 },
      },
    ];

    it('should return paginated experiences', async () => {
      mockPrismaService.experience.findMany.mockResolvedValue(mockExperiences);
      mockPrismaService.experience.count.mockResolvedValue(1);
      mockPrismaService.review.aggregate.mockResolvedValue({
        _avg: { rating: 4.5 },
      });

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].avgRating).toBe(4.5);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by city', async () => {
      mockPrismaService.experience.findMany.mockResolvedValue([]);
      mockPrismaService.experience.count.mockResolvedValue(0);

      await service.findAll({ city: 'Valencia' });

      const findManyCall =
        mockPrismaService.experience.findMany.mock.calls[0][0];
      expect(findManyCall.where.city).toEqual({
        contains: 'Valencia',
        mode: 'insensitive',
      });
    });

    it('should filter by type', async () => {
      mockPrismaService.experience.findMany.mockResolvedValue([]);
      mockPrismaService.experience.count.mockResolvedValue(0);

      await service.findAll({ type: 'pago' });

      const findManyCall =
        mockPrismaService.experience.findMany.mock.calls[0][0];
      expect(findManyCall.where.type).toBe('pago');
    });

    it('should filter by price range', async () => {
      mockPrismaService.experience.findMany.mockResolvedValue([]);
      mockPrismaService.experience.count.mockResolvedValue(0);

      await service.findAll({ minPrice: 10, maxPrice: 50 });

      const findManyCall =
        mockPrismaService.experience.findMany.mock.calls[0][0];
      expect(findManyCall.where.price).toEqual({ gte: 10, lte: 50 });
    });

    it('should apply text search', async () => {
      mockPrismaService.experience.findMany.mockResolvedValue([]);
      mockPrismaService.experience.count.mockResolvedValue(0);

      await service.findAll({ search: 'fallas' });

      const findManyCall =
        mockPrismaService.experience.findMany.mock.calls[0][0];
      expect(findManyCall.where.OR).toBeDefined();
      expect(findManyCall.where.OR).toHaveLength(4);
    });

    it('should sort by price ascending', async () => {
      mockPrismaService.experience.findMany.mockResolvedValue([]);
      mockPrismaService.experience.count.mockResolvedValue(0);

      await service.findAll({ sortBy: 'price_asc' });

      const findManyCall =
        mockPrismaService.experience.findMany.mock.calls[0][0];
      expect(findManyCall.orderBy).toEqual({ price: 'asc' });
    });
  });

  describe('findOne', () => {
    it('should return cached experience if available', async () => {
      const cached = { id: 'exp-1', title: 'Cached', avgRating: 4 };
      mockCacheService.get.mockResolvedValue(cached);

      const result = await service.findOne('exp-1');

      expect(result).toEqual(cached);
      expect(mockPrismaService.experience.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if experience does not exist', async () => {
      mockCacheService.get.mockResolvedValue(undefined);
      mockPrismaService.experience.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return experience and cache the result', async () => {
      mockCacheService.get.mockResolvedValue(undefined);
      mockPrismaService.experience.findUnique.mockResolvedValue({
        id: 'exp-1',
        title: 'Fallas',
        availability: [{ date: new Date('2026-03-15') }],
        host: { id: 'u1', name: 'Host' },
        festival: null,
        category: null,
        reviews: [],
        _count: { reviews: 0, matches: 0 },
      });
      mockPrismaService.review.aggregate.mockResolvedValue({
        _avg: { rating: null },
      });
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.findOne('exp-1');

      expect(result.id).toBe('exp-1');
      expect(result.avgRating).toBe(0);
      expect(mockCacheService.set).toHaveBeenCalled();
    });
  });

  describe('togglePublished', () => {
    const expId = 'exp-1';
    const userId = 'user-1';

    it('should throw NotFoundException if experience does not exist', async () => {
      mockPrismaService.experience.findUnique.mockResolvedValue(null);

      await expect(
        service.togglePublished(expId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the host', async () => {
      mockPrismaService.experience.findUnique.mockResolvedValue({
        id: expId,
        hostId: 'other-user',
        published: true,
      });

      await expect(
        service.togglePublished(expId, userId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should toggle published from true to false', async () => {
      mockPrismaService.experience.findUnique.mockResolvedValue({
        id: expId,
        hostId: userId,
        published: true,
      });
      mockPrismaService.experience.update.mockResolvedValue({
        id: expId,
        published: false,
      });
      mockCacheService.invalidateExperience.mockResolvedValue(undefined);

      const result = await service.togglePublished(expId, userId);

      expect(result.published).toBe(false);
      expect(mockPrismaService.experience.update).toHaveBeenCalledWith({
        where: { id: expId },
        data: { published: false },
      });
      expect(mockCacheService.invalidateExperience).toHaveBeenCalledWith(expId);
    });

    it('should toggle published from false to true', async () => {
      mockPrismaService.experience.findUnique.mockResolvedValue({
        id: expId,
        hostId: userId,
        published: false,
      });
      mockPrismaService.experience.update.mockResolvedValue({
        id: expId,
        published: true,
      });
      mockCacheService.invalidateExperience.mockResolvedValue(undefined);

      const result = await service.togglePublished(expId, userId);

      expect(result.published).toBe(true);
    });
  });

  describe('remove', () => {
    const expId = 'exp-1';
    const userId = 'user-1';

    it('should throw NotFoundException if experience does not exist', async () => {
      mockPrismaService.experience.findUnique.mockResolvedValue(null);

      await expect(service.remove(expId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not the host', async () => {
      mockPrismaService.experience.findUnique.mockResolvedValue({
        id: expId,
        hostId: 'other-user',
      });

      await expect(service.remove(expId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should delete experience and invalidate cache', async () => {
      mockPrismaService.experience.findUnique.mockResolvedValue({
        id: expId,
        hostId: userId,
      });
      mockPrismaService.experience.delete.mockResolvedValue({});
      mockCacheService.invalidateExperiences.mockResolvedValue(undefined);

      const result = await service.remove(expId, userId);

      expect(result.message).toContain('eliminada');
      expect(mockPrismaService.experience.delete).toHaveBeenCalledWith({
        where: { id: expId },
      });
      expect(mockCacheService.invalidateExperiences).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const expId = 'exp-1';
    const userId = 'user-1';

    it('should throw NotFoundException if experience does not exist', async () => {
      mockPrismaService.experience.findUnique.mockResolvedValue(null);

      await expect(
        service.update(expId, { title: 'Updated' } as any, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the host', async () => {
      mockPrismaService.experience.findUnique.mockResolvedValue({
        id: expId,
        hostId: 'other-user',
        city: 'Valencia',
      });

      await expect(
        service.update(expId, { title: 'Updated' } as any, userId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update experience and invalidate cache', async () => {
      mockPrismaService.experience.findUnique.mockResolvedValue({
        id: expId,
        hostId: userId,
        city: 'Valencia',
      });

      const updated = {
        id: expId,
        title: 'Updated Title',
        hostId: userId,
      };

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          const mockTx = {
            experience: {
              update: jest.fn().mockResolvedValue(updated),
            },
            experienceAvailability: {
              deleteMany: jest.fn().mockResolvedValue({}),
              createMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
          };
          return callback(mockTx);
        },
      );
      mockCacheService.invalidateExperience.mockResolvedValue(undefined);

      const result = await service.update(
        expId,
        { title: 'Updated Title' } as any,
        userId,
      );

      expect(result.title).toBe('Updated Title');
      expect(mockCacheService.invalidateExperience).toHaveBeenCalledWith(expId);
    });
  });
});
