import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache/cache.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  // Obtener perfil público de un usuario (cacheado)
  async getPublicProfile(userId: string) {
    const cached = await this.cacheService.get(CACHE_KEYS.USER_PUBLIC(userId));
    if (cached) {
      return cached;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatar: true,
        bio: true,
        city: true,
        age: true,
        hasPartner: true,
        hasChildren: true,
        childrenAges: true,
        verified: true,
        createdAt: true,
        _count: {
          select: {
            experiences: true,
            reviewsReceived: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Calcular rating promedio de reseñas recibidas
    const avgRating = await this.prisma.review.aggregate({
      where: { targetId: userId },
      _avg: { rating: true },
    });

    // Obtener experiencias publicadas del usuario
    const experiences = await this.prisma.experience.findMany({
      where: {
        hostId: userId,
        published: true,
      },
      include: {
        festival: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 6,
    });

    // Calcular rating promedio para cada experiencia
    const experiencesWithRating = await Promise.all(
      experiences.map(async (exp) => {
        const expRating = await this.prisma.review.aggregate({
          where: { experienceId: exp.id },
          _avg: { rating: true },
        });
        return {
          ...exp,
          avgRating: expRating._avg.rating || 0,
        };
      }),
    );

    // Obtener últimas reseñas recibidas
    const reviews = await this.prisma.review.findMany({
      where: { targetId: userId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
            verified: true,
          },
        },
        experience: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    const result = {
      ...user,
      avgRating: avgRating._avg.rating || 0,
      experiences: experiencesWithRating,
      reviews,
    };

    // Cachear por 5 minutos
    await this.cacheService.set(
      CACHE_KEYS.USER_PUBLIC(userId),
      result,
      CACHE_TTL.USER_PROFILE,
    );

    return result;
  }

  // Actualizar perfil propio
  async updateProfile(userId: string, updateDto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateDto,
      select: {
        id: true,
        email: true,
        name: true,
        age: true,
        bio: true,
        city: true,
        avatar: true,
        verified: true,
        createdAt: true,
        hasPartner: true,
        hasChildren: true,
        childrenAges: true,
      },
    });

    // Invalidar cache del usuario
    await this.cacheService.invalidateUser(userId);

    return updated;
  }

  // Obtener perfil completo propio
  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        age: true,
        bio: true,
        city: true,
        avatar: true,
        verified: true,
        createdAt: true,
        hasPartner: true,
        hasChildren: true,
        childrenAges: true,
        _count: {
          select: {
            experiences: true,
            matchesAsHost: true,
            matchesAsRequester: true,
            reviewsReceived: true,
            reviewsGiven: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Calcular rating promedio
    const avgRating = await this.prisma.review.aggregate({
      where: { targetId: userId },
      _avg: { rating: true },
    });

    // Estadísticas de matches
    const [pendingReceived, acceptedMatches, completedMatches] =
      await Promise.all([
        this.prisma.match.count({
          where: { hostId: userId, status: 'pending' },
        }),
        this.prisma.match.count({
          where: {
            OR: [{ hostId: userId }, { requesterId: userId }],
            status: 'accepted',
          },
        }),
        this.prisma.match.count({
          where: {
            OR: [{ hostId: userId }, { requesterId: userId }],
            status: 'completed',
          },
        }),
      ]);

    return {
      ...user,
      avgRating: avgRating._avg.rating || 0,
      stats: {
        pendingReceived,
        acceptedMatches,
        completedMatches,
      },
    };
  }

  // Obtener estadísticas detalladas para anfitriones
  async getHostStats(userId: string) {
    // Obtener experiencias del usuario
    const experiences = await this.prisma.experience.findMany({
      where: { hostId: userId },
      include: {
        _count: {
          select: {
            matches: true,
            reviews: true,
            favorites: true,
          },
        },
      },
    });

    // Calcular estadísticas por experiencia
    const experienceStats = await Promise.all(
      experiences.map(async (exp) => {
        const [matchStats, avgRating] = await Promise.all([
          this.prisma.match.groupBy({
            by: ['status'],
            where: { experienceId: exp.id },
            _count: true,
          }),
          this.prisma.review.aggregate({
            where: { experienceId: exp.id },
            _avg: { rating: true },
          }),
        ]);

        const statusCounts = matchStats.reduce(
          (acc, item) => {
            acc[item.status] = item._count;
            return acc;
          },
          {} as Record<string, number>,
        );

        return {
          id: exp.id,
          title: exp.title,
          city: exp.city,
          type: exp.type,
          price: exp.price,
          published: exp.published,
          totalRequests: exp._count.matches,
          totalReviews: exp._count.reviews,
          totalFavorites: exp._count.favorites,
          avgRating: avgRating._avg.rating || 0,
          pending: statusCounts['pending'] || 0,
          accepted: statusCounts['accepted'] || 0,
          completed: statusCounts['completed'] || 0,
          rejected: statusCounts['rejected'] || 0,
          cancelled: statusCounts['cancelled'] || 0,
        };
      }),
    );

    // Estadísticas globales
    const [totalMatches, completedMatches, avgRating, recentActivity] =
      await Promise.all([
        this.prisma.match.count({
          where: { hostId: userId },
        }),
        this.prisma.match.count({
          where: { hostId: userId, status: 'completed' },
        }),
        this.prisma.review.aggregate({
          where: { targetId: userId },
          _avg: { rating: true },
        }),
        this.prisma.match.findMany({
          where: { hostId: userId },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            experience: {
              select: { id: true, title: true },
            },
            requester: {
              select: { id: true, name: true, avatar: true },
            },
          },
        }),
      ]);

    // Calcular tasa de completado
    const completionRate =
      totalMatches > 0
        ? Math.round((completedMatches / totalMatches) * 100)
        : 0;

    // Estadísticas por mes (últimos 6 meses)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyMatches = await this.prisma.match.groupBy({
      by: ['status'],
      where: {
        hostId: userId,
        createdAt: { gte: sixMonthsAgo },
      },
      _count: true,
    });

    return {
      summary: {
        totalExperiences: experiences.length,
        publishedExperiences: experiences.filter((e) => e.published).length,
        totalRequests: totalMatches,
        completedExperiences: completedMatches,
        completionRate,
        avgRating: avgRating._avg.rating || 0,
        totalFavorites: experiences.reduce(
          (sum, e) => sum + e._count.favorites,
          0,
        ),
      },
      experiences: experienceStats,
      recentActivity: recentActivity.map((m) => ({
        id: m.id,
        status: m.status,
        createdAt: m.createdAt,
        experience: m.experience,
        requester: m.requester,
      })),
      monthlyStats: monthlyMatches.reduce(
        (acc, item) => {
          acc[item.status] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  // Obtener analytics avanzados para hosts
  async getHostAnalytics(userId: string) {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Revenue from completed matches
    const [revenueThisMonth, revenueLastMonth, totalRevenue] =
      await Promise.all([
        this.prisma.transaction.aggregate({
          where: {
            match: { hostId: userId },
            type: 'payment',
            status: 'released',
            createdAt: { gte: thisMonth },
          },
          _sum: { amount: true },
        }),
        this.prisma.transaction.aggregate({
          where: {
            match: { hostId: userId },
            type: 'payment',
            status: 'released',
            createdAt: { gte: lastMonth, lt: thisMonth },
          },
          _sum: { amount: true },
        }),
        this.prisma.transaction.aggregate({
          where: {
            match: { hostId: userId },
            type: 'payment',
            status: 'released',
          },
          _sum: { amount: true },
        }),
      ]);

    const thisMonthRevenue = revenueThisMonth._sum.amount || 0;
    const lastMonthRevenue = revenueLastMonth._sum.amount || 0;
    const revenueGrowth =
      lastMonthRevenue > 0
        ? Math.round(
            ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100,
          )
        : thisMonthRevenue > 0
          ? 100
          : 0;

    // Bookings stats
    const [
      totalBookings,
      pendingBookings,
      completedBookings,
      acceptedBookings,
    ] = await Promise.all([
      this.prisma.match.count({ where: { hostId: userId } }),
      this.prisma.match.count({ where: { hostId: userId, status: 'pending' } }),
      this.prisma.match.count({
        where: { hostId: userId, status: 'completed' },
      }),
      this.prisma.match.count({
        where: { hostId: userId, status: 'accepted' },
      }),
    ]);

    const conversionRate =
      totalBookings > 0
        ? Math.round(
            ((completedBookings + acceptedBookings) / totalBookings) * 100,
          )
        : 0;

    // Reviews stats
    const reviews = await this.prisma.review.findMany({
      where: { targetId: userId },
      select: { rating: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    const distribution = [0, 0, 0, 0, 0]; // 1-5 stars
    reviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) {
        distribution[r.rating - 1]++;
      }
    });

    // Recent reviews trend (last 3 months vs previous 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentReviews = reviews.filter((r) => r.createdAt >= threeMonthsAgo);
    const olderReviews = reviews.filter(
      (r) => r.createdAt >= sixMonthsAgo && r.createdAt < threeMonthsAgo,
    );

    const recentAvg =
      recentReviews.length > 0
        ? recentReviews.reduce((sum, r) => sum + r.rating, 0) /
          recentReviews.length
        : 0;
    const olderAvg =
      olderReviews.length > 0
        ? olderReviews.reduce((sum, r) => sum + r.rating, 0) /
          olderReviews.length
        : 0;

    const reviewTrend = recentAvg - olderAvg;

    // Top experiences
    const topExperiences = await this.prisma.experience.findMany({
      where: { hostId: userId, published: true },
      include: {
        _count: { select: { matches: true } },
        reviews: { select: { rating: true } },
      },
      take: 5,
    });

    const topExperiencesData = topExperiences
      .map((exp) => ({
        id: exp.id,
        title: exp.title,
        bookings: exp._count.matches,
        rating:
          exp.reviews.length > 0
            ? exp.reviews.reduce((sum, r) => sum + r.rating, 0) /
              exp.reviews.length
            : 0,
      }))
      .sort((a, b) => b.bookings - a.bookings);

    return {
      revenue: {
        total: totalRevenue._sum.amount || 0,
        thisMonth: thisMonthRevenue,
        lastMonth: lastMonthRevenue,
        growth: revenueGrowth,
      },
      bookings: {
        total: totalBookings,
        pending: pendingBookings,
        completed: completedBookings,
        conversionRate,
      },
      reviews: {
        average: Math.round(avgRating * 10) / 10,
        total: reviews.length,
        distribution,
        trend: Math.round(reviewTrend * 10) / 10,
      },
      topExperiences: topExperiencesData,
    };
  }

  // Obtener datos de ingresos para gráfico
  async getRevenueChart(userId: string, months: number = 6) {
    const data: { month: string; revenue: number }[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const revenue = await this.prisma.transaction.aggregate({
        where: {
          match: { hostId: userId },
          type: 'payment',
          status: 'released',
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      });

      data.push({
        month: startDate.toLocaleDateString('es-ES', { month: 'short' }),
        revenue: revenue._sum.amount || 0,
      });
    }

    return data;
  }

  // Obtener datos de reservas para gráfico
  async getBookingsChart(userId: string, months: number = 6) {
    const data: { month: string; total: number; completed: number }[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const [total, completed] = await Promise.all([
        this.prisma.match.count({
          where: {
            hostId: userId,
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        this.prisma.match.count({
          where: {
            hostId: userId,
            status: 'completed',
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
      ]);

      data.push({
        month: startDate.toLocaleDateString('es-ES', { month: 'short' }),
        total,
        completed,
      });
    }

    return data;
  }

  // Bloquear usuario
  async blockUser(blockerId: string, blockedId: string, reason?: string) {
    if (blockerId === blockedId) {
      throw new BadRequestException('No puedes bloquearte a ti mismo');
    }

    // Verificar que el usuario a bloquear existe
    const userToBlock = await this.prisma.user.findUnique({
      where: { id: blockedId },
    });

    if (!userToBlock) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar si ya está bloqueado
    const existingBlock = await this.prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });

    if (existingBlock) {
      throw new ConflictException('Este usuario ya está bloqueado');
    }

    return this.prisma.blockedUser.create({
      data: {
        blockerId,
        blockedId,
        reason,
      },
    });
  }

  // Desbloquear usuario
  async unblockUser(blockerId: string, blockedId: string) {
    const block = await this.prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });

    if (!block) {
      throw new NotFoundException('Este usuario no está bloqueado');
    }

    await this.prisma.blockedUser.delete({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });

    return { message: 'Usuario desbloqueado correctamente' };
  }

  // Obtener lista de usuarios bloqueados
  async getBlockedUsers(userId: string) {
    const blockedUsers = await this.prisma.blockedUser.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: {
            id: true,
            name: true,
            avatar: true,
            city: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return blockedUsers.map((b) => ({
      ...b.blocked,
      blockedAt: b.createdAt,
      reason: b.reason,
    }));
  }

  // Verificar si un usuario está bloqueado
  async isUserBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const block = await this.prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });
    return !!block;
  }

  // Verificar si hay bloqueo mutuo (cualquier dirección)
  async hasBlockBetweenUsers(
    userId1: string,
    userId2: string,
  ): Promise<boolean> {
    const block = await this.prisma.blockedUser.findFirst({
      where: {
        OR: [
          { blockerId: userId1, blockedId: userId2 },
          { blockerId: userId2, blockedId: userId1 },
        ],
      },
    });
    return !!block;
  }

  // Obtener IDs de usuarios bloqueados (para filtrar en búsquedas)
  async getBlockedUserIds(userId: string): Promise<string[]> {
    const blocks = await this.prisma.blockedUser.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
      select: {
        blockerId: true,
        blockedId: true,
      },
    });

    const blockedIds = new Set<string>();
    for (const block of blocks) {
      if (block.blockerId === userId) {
        blockedIds.add(block.blockedId);
      } else {
        blockedIds.add(block.blockerId);
      }
    }
    return Array.from(blockedIds);
  }
}
