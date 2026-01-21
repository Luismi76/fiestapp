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
  ANFITRION_ESTRELLA: {
    code: 'anfitrion_estrella',
    name: 'Anfitrion Estrella',
    description: '5 o mas resenas de 5 estrellas como anfitrion',
    icon: '⭐',
    category: 'achievement',
    criteria: { minFiveStarReviews: 5 },
    sortOrder: 2,
  },
  VIAJERO_FRECUENTE: {
    code: 'viajero_frecuente',
    name: 'Viajero Frecuente',
    description: '10 o mas experiencias completadas',
    icon: '🎒',
    category: 'milestone',
    criteria: { minCompletedExperiences: 10 },
    sortOrder: 3,
  },
  PRIMERA_FIESTA: {
    code: 'primera_fiesta',
    name: 'Primera Fiesta',
    description: 'Primera experiencia completada',
    icon: '🎉',
    category: 'milestone',
    criteria: { minCompletedExperiences: 1 },
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
  SUPER_ANFITRION: {
    code: 'super_anfitrion',
    name: 'Super Anfitrion',
    description: '20 o mas experiencias completadas como anfitrion con rating promedio >= 4.5',
    icon: '🏆',
    category: 'achievement',
    criteria: { minHostedExperiences: 20, minAvgRating: 4.5 },
    sortOrder: 6,
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

    // Obtener datos del usuario
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        badges: { include: { badge: true } },
        reviewsReceived: true,
        matchesAsRequester: { where: { status: 'completed' } },
        matchesAsHost: { where: { status: 'completed' } },
      },
    });

    if (!user) return awardedBadges;

    const existingBadgeCodes = user.badges.map((ub) => ub.badge.code);

    // 1. Badge Verificado
    if (user.verified && !existingBadgeCodes.includes('verificado')) {
      const awarded = await this.awardBadge(userId, 'verificado');
      if (awarded) awardedBadges.push('verificado');
    }

    // 2. Badge Perfil Completo
    const isProfileComplete =
      user.name &&
      user.bio &&
      user.city &&
      user.avatar &&
      user.age;
    if (isProfileComplete && !existingBadgeCodes.includes('perfil_completo')) {
      const awarded = await this.awardBadge(userId, 'perfil_completo');
      if (awarded) awardedBadges.push('perfil_completo');
    }

    // 3. Badge Primera Fiesta (1 experiencia completada como participante)
    const completedAsRequester = user.matchesAsRequester.length;
    if (completedAsRequester >= 1 && !existingBadgeCodes.includes('primera_fiesta')) {
      const awarded = await this.awardBadge(userId, 'primera_fiesta');
      if (awarded) awardedBadges.push('primera_fiesta');
    }

    // 4. Badge Viajero Frecuente (10+ experiencias)
    if (completedAsRequester >= 10 && !existingBadgeCodes.includes('viajero_frecuente')) {
      const awarded = await this.awardBadge(userId, 'viajero_frecuente');
      if (awarded) awardedBadges.push('viajero_frecuente');
    }

    // 5. Badge Anfitrion Estrella (5+ resenas de 5 estrellas)
    const fiveStarReviews = user.reviewsReceived.filter((r) => r.rating === 5).length;
    if (fiveStarReviews >= 5 && !existingBadgeCodes.includes('anfitrion_estrella')) {
      const awarded = await this.awardBadge(userId, 'anfitrion_estrella');
      if (awarded) awardedBadges.push('anfitrion_estrella');
    }

    // 6. Badge Super Anfitrion (20+ experiencias como host con rating >= 4.5)
    const completedAsHost = user.matchesAsHost.length;
    const avgRating =
      user.reviewsReceived.length > 0
        ? user.reviewsReceived.reduce((sum, r) => sum + r.rating, 0) / user.reviewsReceived.length
        : 0;
    if (
      completedAsHost >= 20 &&
      avgRating >= 4.5 &&
      !existingBadgeCodes.includes('super_anfitrion')
    ) {
      const awarded = await this.awardBadge(userId, 'super_anfitrion');
      if (awarded) awardedBadges.push('super_anfitrion');
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
