import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// Tipos de badges predefinidos
export const BADGE_DEFINITIONS = {
  VERIFICADO: {
    code: 'verificado',
    name: 'Verificado',
    description: 'Email verificado',
    icon: '✓',
    category: 'verification',
    criteria: { emailVerified: true },
    sortOrder: 1,
  },
  PRIMER_ACUERDO: {
    code: 'primer_acuerdo',
    name: 'Primer Acuerdo',
    description: 'Primer match aceptado',
    icon: '🤝',
    category: 'milestone',
    criteria: { minAcceptedMatches: 1 },
    sortOrder: 2,
  },
  PRIMERA_FIESTA: {
    code: 'primera_fiesta',
    name: 'Primera Fiesta',
    description: 'Primera experiencia completada como viajero',
    icon: '🎉',
    category: 'milestone',
    criteria: { minCompletedExperiences: 1 },
    sortOrder: 3,
  },
  ANFITRION_ACTIVO: {
    code: 'anfitrion_activo',
    name: 'Anfitrion Activo',
    description: 'Al menos una experiencia publicada',
    icon: '🏠',
    category: 'achievement',
    criteria: { minPublishedExperiences: 1 },
    sortOrder: 4,
  },
  PERFIL_COMPLETO: {
    code: 'perfil_completo',
    name: 'Perfil Completo',
    description: 'Todos los campos del perfil completados',
    icon: '📝',
    category: 'achievement',
    criteria: { profileComplete: true },
    sortOrder: 5,
  },
  VIAJERO_FRECUENTE: {
    code: 'viajero_frecuente',
    name: 'Viajero Frecuente',
    description: '10 o mas experiencias completadas como viajero',
    icon: '🎒',
    category: 'milestone',
    criteria: { minCompletedExperiences: 10 },
    sortOrder: 6,
  },
  ANFITRION_ESTRELLA: {
    code: 'anfitrion_estrella',
    name: 'Anfitrion Estrella',
    description: '5 o mas resenas de 5 estrellas como anfitrion',
    icon: '⭐',
    category: 'achievement',
    criteria: { minFiveStarReviews: 5 },
    sortOrder: 7,
  },
  MUY_VALORADO: {
    code: 'muy_valorado',
    name: 'Muy Valorado',
    description: 'Rating promedio de 4.5 o mas con al menos 3 resenas',
    icon: '💫',
    category: 'achievement',
    criteria: { minAvgRating: 4.5, minReviews: 3 },
    sortOrder: 8,
  },
  POPULAR: {
    code: 'popular',
    name: 'Popular',
    description: '10 o mas resenas recibidas',
    icon: '🔥',
    category: 'achievement',
    criteria: { minReviews: 10 },
    sortOrder: 9,
  },
  ANFITRION_EXPERIMENTADO: {
    code: 'anfitrion_experimentado',
    name: 'Anfitrion Experimentado',
    description: '3 o mas experiencias publicadas',
    icon: '🌟',
    category: 'achievement',
    criteria: { minPublishedExperiences: 3 },
    sortOrder: 10,
  },
  SUPER_ANFITRION: {
    code: 'super_anfitrion',
    name: 'Super Anfitrion',
    description:
      '20 o mas experiencias completadas como anfitrion con rating promedio >= 4.5',
    icon: '🏆',
    category: 'achievement',
    criteria: { minHostedExperiences: 20, minAvgRating: 4.5 },
    sortOrder: 11,
  },
  VETERANO: {
    code: 'veterano',
    name: 'Veterano',
    description: 'Miembro por mas de 1 ano',
    icon: '👑',
    category: 'milestone',
    criteria: { minAccountAgeDays: 365 },
    sortOrder: 12,
  },
};

@Injectable()
export class BadgesService {
  private readonly logger = new Logger(BadgesService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Inicializa los badges predefinidos en la base de datos
   */
  async seedBadges(): Promise<void> {
    this.logger.log('Seeding badges...');

    for (const badge of Object.values(BADGE_DEFINITIONS)) {
      await this.prisma.badge.upsert({
        where: { code: badge.code },
        update: {
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          category: badge.category,
          criteria: badge.criteria,
          sortOrder: badge.sortOrder,
        },
        create: {
          code: badge.code,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          category: badge.category,
          criteria: badge.criteria,
          sortOrder: badge.sortOrder,
        },
      });
    }

    this.logger.log('Badges seeded successfully');
  }

  /**
   * Obtiene todos los badges disponibles
   */
  async getAllBadges() {
    return this.prisma.badge.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Obtiene los badges de un usuario
   */
  async getUserBadges(userId: string) {
    return this.prisma.userBadge.findMany({
      where: { userId },
      include: {
        badge: true,
      },
      orderBy: {
        badge: { sortOrder: 'asc' },
      },
    });
  }

  /**
   * Asigna un badge a un usuario
   */
  async awardBadge(userId: string, badgeCode: string): Promise<boolean> {
    const badge = await this.prisma.badge.findUnique({
      where: { code: badgeCode },
    });

    if (!badge || !badge.active) {
      return false;
    }

    // Verificar si ya tiene el badge
    const existing = await this.prisma.userBadge.findUnique({
      where: {
        userId_badgeId: {
          userId,
          badgeId: badge.id,
        },
      },
    });

    if (existing) {
      return false;
    }

    // Asignar badge
    await this.prisma.userBadge.create({
      data: {
        userId,
        badgeId: badge.id,
      },
    });

    // Notificar al usuario
    await this.notificationsService.create({
      userId,
      type: 'badge_earned',
      title: 'Nuevo badge obtenido!',
      message: `Has ganado el badge "${badge.name}": ${badge.description}`,
      data: { badgeId: badge.id, badgeCode: badge.code },
    });

    this.logger.log(`Badge ${badgeCode} awarded to user ${userId}`);
    return true;
  }

  /**
   * Revisa y asigna badges segun los criterios del usuario
   */
  async checkAndAwardBadges(userId: string): Promise<string[]> {
    const awardedBadges: string[] = [];

    // Obtener datos del usuario con todas las relaciones necesarias
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        badges: { include: { badge: true } },
        reviewsReceived: true,
        experiences: { where: { published: true } },
        matchesAsRequester: true,
        matchesAsHost: true,
      },
    });

    if (!user) return awardedBadges;

    const existingBadgeCodes = user.badges.map((ub) => ub.badge.code);

    // Helper para asignar badge
    const tryAward = async (code: string): Promise<void> => {
      if (!existingBadgeCodes.includes(code)) {
        const awarded = await this.awardBadge(userId, code);
        if (awarded) awardedBadges.push(code);
      }
    };

    // Calcular estadisticas
    const completedAsRequester = user.matchesAsRequester.filter(
      (m) => m.status === 'completed',
    ).length;
    const completedAsHost = user.matchesAsHost.filter(
      (m) => m.status === 'completed',
    ).length;
    const acceptedMatches = [
      ...user.matchesAsRequester.filter((m) => m.status === 'accepted'),
      ...user.matchesAsHost.filter((m) => m.status === 'accepted'),
    ].length;
    const publishedExperiences = user.experiences.length;
    const totalReviews = user.reviewsReceived.length;
    const fiveStarReviews = user.reviewsReceived.filter(
      (r) => r.rating === 5,
    ).length;
    const avgRating =
      totalReviews > 0
        ? user.reviewsReceived.reduce((sum, r) => sum + r.rating, 0) /
          totalReviews
        : 0;
    const accountAgeDays = Math.floor(
      (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24),
    );

    // 1. Badge Verificado
    if (user.verified) {
      await tryAward('verificado');
    }

    // 2. Badge Perfil Completo
    const isProfileComplete =
      user.name && user.bio && user.city && user.avatar && user.age;
    if (isProfileComplete) {
      await tryAward('perfil_completo');
    }

    // 3. Badge Primer Acuerdo (1 match aceptado)
    if (acceptedMatches >= 1 || completedAsRequester >= 1 || completedAsHost >= 1) {
      await tryAward('primer_acuerdo');
    }

    // 4. Badge Primera Fiesta (1 experiencia completada como viajero)
    if (completedAsRequester >= 1) {
      await tryAward('primera_fiesta');
    }

    // 5. Badge Anfitrion Activo (1+ experiencias publicadas)
    if (publishedExperiences >= 1) {
      await tryAward('anfitrion_activo');
    }

    // 6. Badge Anfitrion Experimentado (3+ experiencias publicadas)
    if (publishedExperiences >= 3) {
      await tryAward('anfitrion_experimentado');
    }

    // 7. Badge Viajero Frecuente (10+ experiencias completadas)
    if (completedAsRequester >= 10) {
      await tryAward('viajero_frecuente');
    }

    // 8. Badge Muy Valorado (rating >= 4.5 con 3+ resenas)
    if (avgRating >= 4.5 && totalReviews >= 3) {
      await tryAward('muy_valorado');
    }

    // 9. Badge Popular (10+ resenas)
    if (totalReviews >= 10) {
      await tryAward('popular');
    }

    // 10. Badge Anfitrion Estrella (5+ resenas de 5 estrellas)
    if (fiveStarReviews >= 5) {
      await tryAward('anfitrion_estrella');
    }

    // 11. Badge Super Anfitrion (20+ experiencias como host con rating >= 4.5)
    if (completedAsHost >= 20 && avgRating >= 4.5) {
      await tryAward('super_anfitrion');
    }

    // 12. Badge Veterano (cuenta de mas de 1 ano)
    if (accountAgeDays >= 365) {
      await tryAward('veterano');
    }

    return awardedBadges;
  }

  /**
   * Obtiene estadisticas de reputacion de un usuario
   */
  async getUserReputation(userId: string) {
    const [user, badges, reviewStats] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          verified: true,
          createdAt: true,
          _count: {
            select: {
              experiences: true,
              matchesAsHost: { where: { status: 'completed' } },
              matchesAsRequester: { where: { status: 'completed' } },
              reviewsReceived: true,
            },
          },
        },
      }),
      this.getUserBadges(userId),
      this.prisma.review.aggregate({
        where: { targetId: userId },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    if (!user) return null;

    return {
      verified: user.verified,
      memberSince: user.createdAt,
      totalExperiences: user._count.experiences,
      completedAsHost: user._count.matchesAsHost,
      completedAsRequester: user._count.matchesAsRequester,
      totalReviews: reviewStats._count.rating,
      avgRating: reviewStats._avg.rating || 0,
      badges: badges.map((ub) => ({
        code: ub.badge.code,
        name: ub.badge.name,
        description: ub.badge.description,
        icon: ub.badge.icon,
        earnedAt: ub.earnedAt,
      })),
    };
  }
}
