import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Obtener perfil público de un usuario
  async getPublicProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatar: true,
        bio: true,
        city: true,
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

    return {
      ...user,
      avgRating: avgRating._avg.rating || 0,
      experiences: experiencesWithRating,
      reviews,
    };
  }

  // Actualizar perfil propio
  async updateProfile(userId: string, updateDto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.prisma.user.update({
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
      },
    });
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
}
