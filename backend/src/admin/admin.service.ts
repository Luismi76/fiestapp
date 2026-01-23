import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const MAX_STRIKES = 3;

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private notificationsService: NotificationsService,
  ) {}

  async getDashboardStats() {
    const [
      totalUsers,
      verifiedUsers,
      totalExperiences,
      publishedExperiences,
      totalMatches,
      acceptedMatches,
      completedMatches,
      totalReviews,
      recentUsers,
      recentExperiences,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { verified: true } }),
      this.prisma.experience.count(),
      this.prisma.experience.count({ where: { published: true } }),
      this.prisma.match.count(),
      this.prisma.match.count({ where: { status: 'accepted' } }),
      this.prisma.match.count({ where: { status: 'completed' } }),
      this.prisma.review.count(),
      this.prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          verified: true,
        },
      }),
      this.prisma.experience.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          city: true,
          published: true,
          createdAt: true,
          host: { select: { name: true } },
        },
      }),
    ]);

    // Revenue stats - desglosado
    const [platformFees, topups, totalWalletBalance] = await Promise.all([
      // Comisiones de plataforma (1.5€ por acuerdo) - valores negativos, tomamos el absoluto
      this.prisma.transaction.aggregate({
        where: { type: 'platform_fee', status: 'completed' },
        _sum: { amount: true },
        _count: { amount: true },
      }),
      // Recargas de usuarios
      this.prisma.transaction.aggregate({
        where: { type: 'topup', status: 'completed' },
        _sum: { amount: true },
        _count: { amount: true },
      }),
      // Saldo total en monederos
      this.prisma.wallet.aggregate({
        _sum: { balance: true },
      }),
    ]);

    // Las comisiones se guardan como negativas (-1.5€), así que tomamos el valor absoluto
    const platformRevenue = Math.abs(platformFees._sum.amount || 0);
    // Cada acuerdo genera 2 transacciones (host + guest), así que dividimos entre 2
    const agreementsClosed = Math.floor((platformFees._count.amount || 0) / 2);

    return {
      users: {
        total: totalUsers,
        verified: verifiedUsers,
        unverified: totalUsers - verifiedUsers,
      },
      experiences: {
        total: totalExperiences,
        published: publishedExperiences,
        drafts: totalExperiences - publishedExperiences,
      },
      matches: {
        total: totalMatches,
        accepted: acceptedMatches,
        completed: completedMatches,
      },
      reviews: totalReviews,
      // Desglose financiero
      revenue: {
        platformCommissions: platformRevenue,
        agreementsClosed,
        userTopups: topups._sum.amount || 0,
        topupsCount: topups._count.amount || 0,
        totalWalletBalance: totalWalletBalance._sum.balance || 0,
      },
      recentUsers,
      recentExperiences,
    };
  }

  async getUsers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          verified: true,
          city: true,
          createdAt: true,
          _count: {
            select: {
              experiences: true,
              matchesAsHost: true,
              matchesAsRequester: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getExperiences(
    page = 1,
    limit = 20,
    status?: 'all' | 'published' | 'draft',
  ) {
    const skip = (page - 1) * limit;

    const where =
      status === 'published'
        ? { published: true }
        : status === 'draft'
          ? { published: false }
          : {};

    const [experiences, total] = await Promise.all([
      this.prisma.experience.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          city: true,
          type: true,
          price: true,
          published: true,
          createdAt: true,
          host: { select: { id: true, name: true, email: true } },
          festival: { select: { name: true } },
          _count: {
            select: {
              matches: true,
              reviews: true,
            },
          },
        },
      }),
      this.prisma.experience.count({ where }),
    ]);

    return {
      experiences,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async toggleExperiencePublished(experienceId: string) {
    const experience = await this.prisma.experience.findUnique({
      where: { id: experienceId },
    });

    if (!experience) {
      throw new Error('Experiencia no encontrada');
    }

    return this.prisma.experience.update({
      where: { id: experienceId },
      data: { published: !experience.published },
    });
  }

  async setUserRole(userId: string, role: 'user' | 'admin') {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
  }

  async deleteUser(userId: string) {
    // This will cascade delete related records based on schema
    return this.prisma.user.delete({
      where: { id: userId },
    });
  }

  async deleteExperience(experienceId: string) {
    return this.prisma.experience.delete({
      where: { id: experienceId },
    });
  }

  async impersonateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        verified: true,
        city: true,
        age: true,
        bio: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

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
      },
    };
  }

  // ============================================
  // Sistema de Strikes y Bans
  // ============================================

  /**
   * Añade un strike a un usuario
   */
  async addStrike(
    userId: string,
    reason: string,
  ): Promise<{ strikes: number; banned: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, strikes: true, bannedAt: true, name: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.bannedAt) {
      throw new BadRequestException('El usuario ya esta baneado');
    }

    const newStrikes = user.strikes + 1;
    const shouldBan = newStrikes >= MAX_STRIKES;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        strikes: newStrikes,
        ...(shouldBan && {
          bannedAt: new Date(),
          banReason: `Ban automatico por ${MAX_STRIKES} strikes. Ultimo motivo: ${reason}`,
        }),
      },
    });

    // Notificar al usuario
    await this.notificationsService.create({
      userId,
      type: 'system',
      title: shouldBan ? 'Cuenta suspendida' : 'Has recibido un strike',
      message: shouldBan
        ? `Tu cuenta ha sido suspendida por acumular ${MAX_STRIKES} strikes.`
        : `Has recibido un strike (${newStrikes}/${MAX_STRIKES}). Motivo: ${reason}`,
      data: { strikes: newStrikes, reason },
    });

    return { strikes: newStrikes, banned: shouldBan };
  }

  /**
   * Elimina un strike de un usuario
   */
  async removeStrike(userId: string): Promise<{ strikes: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { strikes: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const newStrikes = Math.max(0, user.strikes - 1);

    await this.prisma.user.update({
      where: { id: userId },
      data: { strikes: newStrikes },
    });

    return { strikes: newStrikes };
  }

  /**
   * Banea a un usuario manualmente
   */
  async banUser(userId: string, reason: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, bannedAt: true, name: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.bannedAt) {
      throw new BadRequestException('El usuario ya esta baneado');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        bannedAt: new Date(),
        banReason: reason,
      },
    });

    // Notificar al usuario
    await this.notificationsService.create({
      userId,
      type: 'system',
      title: 'Cuenta suspendida',
      message: `Tu cuenta ha sido suspendida. Motivo: ${reason}`,
      data: { reason },
    });
  }

  /**
   * Desbanea a un usuario
   */
  async unbanUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, bannedAt: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!user.bannedAt) {
      throw new BadRequestException('El usuario no esta baneado');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        bannedAt: null,
        banReason: null,
        strikes: 0, // Reset strikes al desbanear
      },
    });

    // Notificar al usuario
    await this.notificationsService.create({
      userId,
      type: 'system',
      title: 'Cuenta reactivada',
      message: 'Tu cuenta ha sido reactivada. Tus strikes han sido reseteados.',
    });
  }

  /**
   * Obtiene usuarios baneados
   */
  async getBannedUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { bannedAt: { not: null } },
        skip,
        take: limit,
        orderBy: { bannedAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          bannedAt: true,
          banReason: true,
          strikes: true,
        },
      }),
      this.prisma.user.count({ where: { bannedAt: { not: null } } }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtiene usuarios con strikes (potenciales problemas)
   */
  async getUsersWithStrikes(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { strikes: { gt: 0 }, bannedAt: null },
        skip,
        take: limit,
        orderBy: { strikes: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          strikes: true,
          createdAt: true,
          _count: {
            select: { reports: true },
          },
        },
      }),
      this.prisma.user.count({ where: { strikes: { gt: 0 }, bannedAt: null } }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // Dashboard Mejorado - Graficas y Metricas
  // ============================================

  /**
   * Obtiene datos para grafica de usuarios registrados por mes
   */
  async getUsersChartData(months = 12) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const users = await this.prisma.user.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Agrupar por mes
    const grouped = new Map<string, number>();
    for (let i = 0; i < months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - (months - 1 - i));
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      grouped.set(key, 0);
    }

    users.forEach((u) => {
      const key = `${u.createdAt.getFullYear()}-${String(u.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (grouped.has(key)) {
        grouped.set(key, (grouped.get(key) || 0) + 1);
      }
    });

    return Array.from(grouped.entries()).map(([month, count]) => ({
      month,
      count,
    }));
  }

  /**
   * Obtiene datos para grafica de comisiones de plataforma por mes
   * Solo cuenta las comisiones (platform_fee), no las recargas
   */
  async getRevenueChartData(months = 12) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    // Solo transacciones de comision de plataforma (ingresos reales)
    const transactions = await this.prisma.transaction.findMany({
      where: {
        createdAt: { gte: startDate },
        status: 'completed',
        type: 'platform_fee', // Solo comisiones
      },
      select: { createdAt: true, amount: true },
      orderBy: { createdAt: 'asc' },
    });

    // Agrupar por mes
    const grouped = new Map<string, number>();
    for (let i = 0; i < months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - (months - 1 - i));
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      grouped.set(key, 0);
    }

    transactions.forEach((t) => {
      const key = `${t.createdAt.getFullYear()}-${String(t.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (grouped.has(key)) {
        // Las comisiones se guardan como negativas, tomamos valor absoluto
        grouped.set(key, (grouped.get(key) || 0) + Math.abs(t.amount));
      }
    });

    return Array.from(grouped.entries()).map(([month, revenue]) => ({
      month,
      revenue: Math.round(revenue * 100) / 100,
    }));
  }

  /**
   * Obtiene estadisticas de matches (completados vs cancelados)
   */
  async getMatchesStats() {
    const [completed, cancelled, pending, accepted, rejected] =
      await Promise.all([
        this.prisma.match.count({ where: { status: 'completed' } }),
        this.prisma.match.count({ where: { status: 'cancelled' } }),
        this.prisma.match.count({ where: { status: 'pending' } }),
        this.prisma.match.count({ where: { status: 'accepted' } }),
        this.prisma.match.count({ where: { status: 'rejected' } }),
      ]);

    const total = completed + cancelled + pending + accepted + rejected;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    const cancellationRate = total > 0 ? (cancelled / total) * 100 : 0;

    return {
      completed,
      cancelled,
      pending,
      accepted,
      rejected,
      total,
      completionRate: Math.round(completionRate * 100) / 100,
      cancellationRate: Math.round(cancellationRate * 100) / 100,
    };
  }

  /**
   * Obtiene top experiencias por rating
   */
  async getTopExperiences(limit = 10) {
    const experiences = await this.prisma.experience.findMany({
      where: { published: true },
      include: {
        host: { select: { name: true } },
        festival: { select: { name: true } },
        reviews: { select: { rating: true } },
        _count: {
          select: {
            reviews: true,
            matches: { where: { status: 'completed' } },
          },
        },
      },
      take: limit * 2, // Traemos mas para ordenar
    });

    // Calcular rating y ordenar
    const withRating = experiences.map((e) => {
      const avgRating =
        e.reviews.length > 0
          ? e.reviews.reduce((sum, r) => sum + r.rating, 0) / e.reviews.length
          : 0;

      return {
        id: e.id,
        title: e.title,
        city: e.city,
        avgRating: Math.round(avgRating * 100) / 100,
        hostName: e.host.name,
        festivalName: e.festival?.name,
        reviewCount: e._count.reviews,
        completedMatches: e._count.matches,
      };
    });

    return withRating.sort((a, b) => b.avgRating - a.avgRating).slice(0, limit);
  }

  /**
   * Obtiene top anfitriones
   */
  async getTopHosts(limit = 10) {
    const hosts = await this.prisma.user.findMany({
      where: {
        experiences: { some: { published: true } },
        bannedAt: null,
      },
      include: {
        _count: {
          select: {
            experiences: { where: { published: true } },
            matchesAsHost: { where: { status: 'completed' } },
          },
        },
        // Reviews recibidas como target (anfitrion)
        reviewsReceived: {
          select: { rating: true },
        },
      },
      take: limit * 2, // Traemos mas para filtrar
    });

    // Calcular rating promedio para cada host
    const hostsWithRating = hosts.map((host) => {
      const avgRating =
        host.reviewsReceived.length > 0
          ? host.reviewsReceived.reduce((sum, r) => sum + r.rating, 0) /
            host.reviewsReceived.length
          : 0;

      return {
        id: host.id,
        name: host.name,
        avatar: host.avatar,
        verified: host.verified,
        city: host.city,
        experienceCount: host._count.experiences,
        completedMatches: host._count.matchesAsHost,
        avgRating: Math.round(avgRating * 100) / 100,
        reviewCount: host.reviewsReceived.length,
      };
    });

    // Ordenar por rating y matches completados
    return hostsWithRating
      .sort((a, b) => {
        if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
        return b.completedMatches - a.completedMatches;
      })
      .slice(0, limit);
  }

  /**
   * Obtiene usuarios activos en los ultimos dias
   */
  async getActiveUsers(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Usuarios que han hecho login o han tenido actividad
    const [usersWithMatches, usersWithMessages, usersWithReviews] =
      await Promise.all([
        this.prisma.match.findMany({
          where: { createdAt: { gte: startDate } },
          select: { requesterId: true },
          distinct: ['requesterId'],
        }),
        this.prisma.message.findMany({
          where: { createdAt: { gte: startDate } },
          select: { senderId: true },
          distinct: ['senderId'],
        }),
        this.prisma.review.findMany({
          where: { createdAt: { gte: startDate } },
          select: { authorId: true },
          distinct: ['authorId'],
        }),
      ]);

    const activeUserIds = new Set([
      ...usersWithMatches.map((m) => m.requesterId),
      ...usersWithMessages.map((m) => m.senderId),
      ...usersWithReviews.map((r) => r.authorId),
    ]);

    return {
      activeUsers: activeUserIds.size,
      period: `${days} dias`,
    };
  }

  /**
   * Obtiene tasa de conversion
   */
  async getConversionStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers,
      usersLast30Days,
      usersWithMatches,
      usersWithCompletedMatches,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.user.count({
        where: {
          OR: [
            { matchesAsRequester: { some: {} } },
            { matchesAsHost: { some: {} } },
          ],
        },
      }),
      this.prisma.user.count({
        where: {
          OR: [
            { matchesAsRequester: { some: { status: 'completed' } } },
            { matchesAsHost: { some: { status: 'completed' } } },
          ],
        },
      }),
    ]);

    const registrationToMatchRate =
      totalUsers > 0 ? (usersWithMatches / totalUsers) * 100 : 0;
    const matchToCompletionRate =
      usersWithMatches > 0
        ? (usersWithCompletedMatches / usersWithMatches) * 100
        : 0;

    return {
      totalUsers,
      newUsersLast30Days: usersLast30Days,
      usersWithMatches,
      usersWithCompletedMatches,
      registrationToMatchRate: Math.round(registrationToMatchRate * 100) / 100,
      matchToCompletionRate: Math.round(matchToCompletionRate * 100) / 100,
    };
  }

  // ============================================
  // Gestion Avanzada de Usuarios
  // ============================================

  /**
   * Obtiene usuarios con filtros avanzados
   */
  async getUsersAdvanced(
    page = 1,
    limit = 20,
    filters: {
      search?: string;
      verified?: boolean;
      banned?: boolean;
      hasStrikes?: boolean;
      role?: 'user' | 'admin';
      dateFrom?: Date;
      dateTo?: Date;
      orderBy?: 'createdAt' | 'name' | 'email' | 'matches' | 'revenue';
      orderDir?: 'asc' | 'desc';
    } = {},
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.verified !== undefined) {
      where.verified = filters.verified;
    }

    if (filters.banned !== undefined) {
      where.bannedAt = filters.banned ? { not: null } : null;
    }

    if (filters.hasStrikes) {
      where.strikes = { gt: 0 };
    }

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    let orderBy: any = { createdAt: 'desc' };
    if (filters.orderBy) {
      const dir = filters.orderDir || 'desc';
      if (filters.orderBy === 'matches') {
        orderBy = { matchesAsRequester: { _count: dir } };
      } else {
        orderBy = { [filters.orderBy]: dir };
      }
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          verified: true,
          city: true,
          strikes: true,
          bannedAt: true,
          banReason: true,
          createdAt: true,
          _count: {
            select: {
              experiences: true,
              matchesAsHost: true,
              matchesAsRequester: true,
              reviewsGiven: true,
            },
          },
          wallet: {
            select: { balance: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
        ...u,
        totalMatches: u._count.matchesAsHost + u._count.matchesAsRequester,
        walletBalance: u.wallet?.balance || 0,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtiene detalle completo de un usuario
   */
  async getUserDetail(userId: string) {
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
        role: true,
        strikes: true,
        bannedAt: true,
        banReason: true,
        referralCode: true,
        referralCreditsEarned: true,
        createdAt: true,
        updatedAt: true,
        wallet: {
          select: { balance: true, createdAt: true },
        },
        experiences: {
          select: {
            id: true,
            title: true,
            published: true,
            createdAt: true,
            _count: { select: { matches: true, reviews: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        matchesAsRequester: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            experience: { select: { title: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        matchesAsHost: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            experience: { select: { title: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        reviewsGiven: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        reviewsReceived: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            author: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        reports: {
          select: {
            id: true,
            reason: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        referrals: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
        badges: {
          select: {
            badge: { select: { name: true, icon: true } },
            earnedAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Obtener transacciones
    const transactions = await this.prisma.transaction.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        amount: true,
        status: true,
        description: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      ...user,
      transactions,
    };
  }

  /**
   * Exporta usuarios a CSV
   */
  async exportUsersToCSV(
    filters: {
      verified?: boolean;
      banned?: boolean;
      dateFrom?: Date;
      dateTo?: Date;
    } = {},
  ): Promise<string> {
    const where: any = {};

    if (filters.verified !== undefined) {
      where.verified = filters.verified;
    }
    if (filters.banned !== undefined) {
      where.bannedAt = filters.banned ? { not: null } : null;
    }
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        city: true,
        verified: true,
        role: true,
        strikes: true,
        bannedAt: true,
        createdAt: true,
        _count: {
          select: {
            experiences: true,
            matchesAsHost: true,
            matchesAsRequester: true,
          },
        },
        wallet: { select: { balance: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'ID',
      'Email',
      'Nombre',
      'Ciudad',
      'Verificado',
      'Rol',
      'Strikes',
      'Baneado',
      'Experiencias',
      'Matches (Host)',
      'Matches (Requester)',
      'Balance Wallet',
      'Fecha Registro',
    ];

    const rows = users.map((u) => [
      u.id,
      u.email,
      u.name,
      u.city || '',
      u.verified ? 'Si' : 'No',
      u.role,
      u.strikes.toString(),
      u.bannedAt ? 'Si' : 'No',
      u._count.experiences.toString(),
      u._count.matchesAsHost.toString(),
      u._count.matchesAsRequester.toString(),
      (u.wallet?.balance || 0).toString(),
      u.createdAt.toISOString(),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      ),
    ].join('\n');

    return csv;
  }

  /**
   * Acciones en bulk para usuarios
   */
  async bulkVerifyUsers(userIds: string[]): Promise<number> {
    const result = await this.prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { verified: true },
    });
    return result.count;
  }

  async bulkBanUsers(userIds: string[], reason: string): Promise<number> {
    const result = await this.prisma.user.updateMany({
      where: { id: { in: userIds }, bannedAt: null },
      data: { bannedAt: new Date(), banReason: reason },
    });

    // Notificar a cada usuario
    for (const userId of userIds) {
      await this.notificationsService.create({
        userId,
        type: 'system',
        title: 'Cuenta suspendida',
        message: `Tu cuenta ha sido suspendida. Motivo: ${reason}`,
        data: { reason },
      });
    }

    return result.count;
  }
}
