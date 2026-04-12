import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { CancellationPolicy } from '@prisma/client';

export interface RefundCalculation {
  refundPercentage: number;
  refundAmount: number;
  penaltyAmount: number;
  policy: CancellationPolicy;
  hoursUntilStart: number;
  forceMajeure?: boolean;
}

/**
 * Políticas de cancelación:
 * - FLEXIBLE: 100% hasta 24h antes
 * - MODERATE: 100% hasta 72h, 50% hasta 24h
 * - STRICT: 100% hasta 7d, 50% hasta 72h, 0% después
 * - NON_REFUNDABLE: Sin reembolso
 */
@Injectable()
export class CancellationsService {
  private readonly logger = new Logger(CancellationsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private platformConfig: PlatformConfigService,
  ) {}

  /**
   * Calcula el reembolso según la política de cancelación
   * @param policy - Política de cancelación de la experiencia
   * @param originalAmount - Monto original pagado
   * @param startDate - Fecha de inicio de la experiencia
   * @param cancelDate - Fecha de cancelación (por defecto ahora)
   * @param forceMajeure - Si es true, reembolso 100% independientemente de la política
   */
  calculateRefund(
    policy: CancellationPolicy,
    originalAmount: number,
    startDate: Date,
    cancelDate: Date = new Date(),
    forceMajeure: boolean = false,
  ): RefundCalculation {
    const hoursUntilStart =
      (startDate.getTime() - cancelDate.getTime()) / (1000 * 60 * 60);

    let refundPercentage = 0;

    // Fuerza mayor: reembolso total siempre
    if (forceMajeure) {
      refundPercentage = 100;
      const refundAmount = originalAmount;
      return {
        refundPercentage,
        refundAmount,
        penaltyAmount: 0,
        policy,
        hoursUntilStart: Math.max(0, hoursUntilStart),
      };
    }

    switch (policy) {
      case CancellationPolicy.FLEXIBLE:
        // 100% hasta 24h, 50% entre 12-24h, 0% menos de 12h
        if (hoursUntilStart >= 24) {
          refundPercentage = 100;
        } else if (hoursUntilStart >= 12) {
          refundPercentage = 50;
        } else {
          refundPercentage = 0;
        }
        break;

      case CancellationPolicy.MODERATE:
        // 100% hasta 72h, 50% hasta 24h
        if (hoursUntilStart >= 72) {
          refundPercentage = 100;
        } else if (hoursUntilStart >= 24) {
          refundPercentage = 50;
        } else {
          refundPercentage = 0;
        }
        break;

      case CancellationPolicy.STRICT:
        // 100% hasta 7d (168h), 50% hasta 72h, 0% después
        if (hoursUntilStart >= 168) {
          refundPercentage = 100;
        } else if (hoursUntilStart >= 72) {
          refundPercentage = 50;
        } else {
          refundPercentage = 0;
        }
        break;

      case CancellationPolicy.NON_REFUNDABLE:
        refundPercentage = 0;
        break;

      default:
        // Por defecto, usar política flexible
        if (hoursUntilStart >= 24) {
          refundPercentage = 100;
        } else if (hoursUntilStart >= 12) {
          refundPercentage = 50;
        } else {
          refundPercentage = 0;
        }
    }

    const refundAmount =
      Math.round(((originalAmount * refundPercentage) / 100) * 100) / 100;
    const penaltyAmount =
      Math.round((originalAmount - refundAmount) * 100) / 100;

    return {
      refundPercentage,
      refundAmount,
      penaltyAmount,
      policy,
      hoursUntilStart: Math.max(0, hoursUntilStart),
    };
  }

  /**
   * Obtiene información legible de la política de cancelación
   */
  getPolicyDescription(policy: CancellationPolicy): {
    name: string;
    description: string;
    rules: string[];
  } {
    switch (policy) {
      case CancellationPolicy.FLEXIBLE:
        return {
          name: 'Flexible',
          description: 'Cancelación gratuita hasta 24 horas antes',
          rules: [
            'Reembolso del 100% si cancelas al menos 24 horas antes',
            'Reembolso del 50% si cancelas entre 12 y 24 horas antes',
            'Sin reembolso si cancelas con menos de 12 horas de antelación',
          ],
        };

      case CancellationPolicy.MODERATE:
        return {
          name: 'Moderada',
          description: 'Reembolso parcial según el momento de cancelación',
          rules: [
            'Reembolso del 100% si cancelas al menos 72 horas (3 días) antes',
            'Reembolso del 50% si cancelas entre 24 y 72 horas antes',
            'Sin reembolso si cancelas con menos de 24 horas de antelación',
          ],
        };

      case CancellationPolicy.STRICT:
        return {
          name: 'Estricta',
          description: 'Política de reembolso más restrictiva',
          rules: [
            'Reembolso del 100% si cancelas al menos 7 días antes',
            'Reembolso del 50% si cancelas entre 72 horas (3 días) y 7 días antes',
            'Sin reembolso si cancelas con menos de 72 horas de antelación',
          ],
        };

      case CancellationPolicy.NON_REFUNDABLE:
        return {
          name: 'Sin reembolso',
          description: 'No se admiten reembolsos por cancelación',
          rules: [
            'Sin reembolso en caso de cancelación',
            'Solo se reembolsará si el anfitrión cancela la experiencia',
          ],
        };

      default:
        return {
          name: 'Flexible',
          description: 'Cancelación gratuita hasta 24 horas antes',
          rules: [
            'Reembolso del 100% si cancelas al menos 24 horas antes',
            'Reembolso del 50% si cancelas entre 12 y 24 horas antes',
            'Sin reembolso si cancelas con menos de 12 horas de antelación',
          ],
        };
    }
  }

  /**
   * Registra una cancelación en la base de datos
   */
  async recordCancellation(
    matchId: string,
    cancelledById: string,
    reason: string | undefined,
    refundCalculation: RefundCalculation,
    cancelledByRole?: 'host' | 'requester',
    forceMajeure?: boolean,
  ) {
    return this.prisma.cancellation.create({
      data: {
        matchId,
        cancelledById,
        reason,
        policy: refundCalculation.policy,
        originalAmount:
          refundCalculation.refundAmount + refundCalculation.penaltyAmount,
        refundPercentage: refundCalculation.refundPercentage,
        refundAmount: refundCalculation.refundAmount,
        penaltyAmount: refundCalculation.penaltyAmount,
        cancelledByRole,
        forceMajeure: forceMajeure ?? false,
        processedAt: refundCalculation.refundAmount > 0 ? new Date() : null,
      },
    });
  }

  /**
   * Obtiene el historial de cancelaciones de un usuario
   */
  async getUserCancellations(userId: string) {
    return this.prisma.cancellation.findMany({
      where: { cancelledById: userId },
      include: {
        match: {
          include: {
            experience: {
              select: { id: true, title: true, city: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Obtiene estadísticas de cancelaciones de un usuario
   */
  async getCancellationStats(userId: string) {
    const [total, asHost, asRequester, last30Days] = await Promise.all([
      this.prisma.cancellation.count({
        where: { cancelledById: userId },
      }),
      this.prisma.cancellation.count({
        where: {
          cancelledById: userId,
          match: { hostId: userId },
        },
      }),
      this.prisma.cancellation.count({
        where: {
          cancelledById: userId,
          match: { requesterId: userId },
        },
      }),
      this.prisma.cancellation.count({
        where: {
          cancelledById: userId,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const totalRefunded = await this.prisma.cancellation.aggregate({
      where: { cancelledById: userId },
      _sum: { refundAmount: true },
    });

    return {
      total,
      asHost,
      asRequester,
      last30Days,
      totalRefunded: totalRefunded._sum.refundAmount || 0,
    };
  }

  /**
   * Verifica si un usuario tiene demasiadas cancelaciones recientes
   * (para posible penalización)
   */
  async hasTooManyCancellations(
    userId: string,
    limit: number = 3,
    days: number = 30,
  ): Promise<boolean> {
    const count = await this.prisma.cancellation.count({
      where: {
        cancelledById: userId,
        createdAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
      },
    });

    return count >= limit;
  }

  /**
   * Verifica el estado de cancelaciones de un usuario y devuelve advertencia/bloqueo
   */
  async getCancellationWarning(userId: string): Promise<{
    canCancel: boolean;
    warningLevel: 'none' | 'warning' | 'blocked';
    recentCount: number;
    limit: number;
    message?: string;
  }> {
    const limit = 3;
    const days = 30;
    const recentCount = await this.prisma.cancellation.count({
      where: {
        cancelledById: userId,
        createdAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
      },
    });

    if (recentCount >= limit) {
      return {
        canCancel: false,
        warningLevel: 'blocked',
        recentCount,
        limit,
        message: `Has alcanzado el límite de ${limit} cancelaciones en los últimos ${days} días. Contacta con soporte si necesitas ayuda.`,
      };
    }

    if (recentCount >= limit - 1) {
      return {
        canCancel: true,
        warningLevel: 'warning',
        recentCount,
        limit,
        message: `Esta es tu cancelación ${recentCount + 1} de ${limit} permitidas en 30 días. Una más y tu cuenta podría ser restringida.`,
      };
    }

    return { canCancel: true, warningLevel: 'none', recentCount, limit };
  }

  /**
   * Verifica y penaliza a hosts con demasiadas cancelaciones
   * - 2 cancelaciones en 30 días: advertencia
   * - 3+ cancelaciones en 30 días: auto-strike + despublicar experiencias si >= 3 strikes
   */
  async checkAndPenalizeHost(userId: string): Promise<void> {
    const days = 30;
    const hostCancellations = await this.prisma.cancellation.count({
      where: {
        cancelledById: userId,
        cancelledByRole: 'host',
        createdAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
      },
    });

    if (hostCancellations >= 3) {
      // Auto-strike
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { strikes: { increment: 1 } },
      });

      this.logger.warn(
        `Host ${userId} recibió auto-strike por ${hostCancellations} cancelaciones en ${days} días (total strikes: ${user.strikes})`,
      );

      // Notificar al host
      await this.notificationsService.create({
        userId,
        type: 'system',
        title: 'Penalización por cancelaciones',
        message: `Has acumulado ${hostCancellations} cancelaciones como anfitrión en los últimos ${days} días. Se ha registrado una advertencia en tu cuenta.`,
        data: { hostCancellations, strikes: user.strikes },
      });

      // Si tiene 3+ strikes, despublicar todas sus experiencias
      if (user.strikes >= 3) {
        await this.prisma.experience.updateMany({
          where: { hostId: userId, published: true },
          data: { published: false },
        });

        await this.notificationsService.create({
          userId,
          type: 'system',
          title: 'Experiencias despublicadas',
          message:
            'Tus experiencias han sido despublicadas debido a cancelaciones reiteradas. Contacta con soporte para más información.',
          data: { strikes: user.strikes },
        });

        this.logger.warn(
          `Host ${userId} alcanzó ${user.strikes} strikes: experiencias despublicadas`,
        );
      }
    } else if (hostCancellations >= 2) {
      // Advertencia
      await this.notificationsService.create({
        userId,
        type: 'system',
        title: 'Aviso: cancelaciones frecuentes',
        message: `Has cancelado ${hostCancellations} experiencias como anfitrión en los últimos ${days} días. Una más y recibirás una penalización en tu cuenta.`,
        data: { hostCancellations },
      });
    }
  }

  /**
   * Calcula preview del reembolso para mostrar al usuario antes de cancelar
   * Incluye estimación de costes Stripe para transparencia
   */
  /**
   * Previsualización del refund antes de cancelar.
   * Si se pasa userId, calculamos según quién cancela:
   * - Si el host cancela: el host absorbe la comisión Stripe, el viajero
   *   recibe el importe bruto
   * - Si el viajero cancela: el viajero asume la comisión Stripe (recibe neto)
   * Sin userId, asumimos cancelación del viajero (más conservador).
   */
  async previewCancellation(
    matchId: string,
    userId?: string,
  ): Promise<{
    refund: RefundCalculation;
    policyInfo: ReturnType<typeof this.getPolicyDescription>;
    stripeInfo: {
      isStripeHold: boolean;
      estimatedStripeFee: number;
      netRefundAmount: number;
      cancelledByHost: boolean;
    };
  } | null> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        experience: {
          select: { cancellationPolicy: true },
        },
      },
    });

    if (!match || !match.startDate || !match.totalPrice) {
      return null;
    }

    const policy = match.experience.cancellationPolicy;
    const refund = this.calculateRefund(
      policy,
      match.totalPrice,
      match.startDate,
    );
    const policyInfo = this.getPolicyDescription(policy);

    // Determinar si el pago está en stripe_hold o platform_hold
    let isStripeHold = false;
    if (refund.refundAmount > 0) {
      const paymentTx = await this.prisma.transaction.findFirst({
        where: {
          matchId,
          type: 'experience_payment',
          status: { in: ['held', 'completed', 'released'] },
        },
      });
      isStripeHold = paymentTx?.description?.includes('[stripe_hold]') || false;
    }

    // Stripe no devuelve su comisión en refunds de pagos ya capturados
    const cancelledByHost = userId !== undefined && userId === match.hostId;
    const estimatedStripeFee =
      isStripeHold || refund.refundAmount === 0
        ? 0
        : this.platformConfig.calculateStripeFee(refund.refundAmount);
    // Si cancela el host, él asume la comisión y el viajero recibe el bruto.
    // Si cancela el viajero, el viajero recibe el neto (sin la comisión Stripe).
    const netRefundAmount = cancelledByHost
      ? refund.refundAmount
      : Math.round((refund.refundAmount - estimatedStripeFee) * 100) / 100;

    return {
      refund,
      policyInfo,
      stripeInfo: {
        isStripeHold,
        estimatedStripeFee,
        netRefundAmount,
        cancelledByHost,
      },
    };
  }

  /**
   * Obtiene las políticas de cancelación disponibles para un usuario.
   * NON_REFUNDABLE requiere: verificationLevel >= IDENTITY, avgRating >= 4.0, 3+ experiencias completadas como host
   */
  async getAvailablePolicies(userId: string): Promise<{
    policies: CancellationPolicy[];
    restrictions: Record<string, { allowed: boolean; reason?: string }>;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { verificationLevel: true },
    });

    // Calcular avgRating del host
    const ratingAgg = await this.prisma.review.aggregate({
      where: {
        experience: { hostId: userId },
      },
      _avg: { rating: true },
      _count: { rating: true },
    });

    // Contar experiencias completadas como host
    const completedAsHost = await this.prisma.match.count({
      where: { hostId: userId, status: 'completed' },
    });

    const avgRating = ratingAgg._avg.rating || 0;
    const verificationLevel = user?.verificationLevel || 'NONE';
    const verificationMeetsRequirement =
      verificationLevel === 'IDENTITY' || verificationLevel === 'FULL';

    const nonRefundableAllowed =
      verificationMeetsRequirement && avgRating >= 4.0 && completedAsHost >= 3;

    const restrictions: Record<string, { allowed: boolean; reason?: string }> =
      {
        FLEXIBLE: { allowed: true },
        MODERATE: { allowed: true },
        STRICT: { allowed: true },
        NON_REFUNDABLE: {
          allowed: nonRefundableAllowed,
          reason: nonRefundableAllowed
            ? undefined
            : this.getNonRefundableRestrictionReason(
                verificationMeetsRequirement,
                avgRating,
                completedAsHost,
              ),
        },
      };

    const policies = Object.entries(restrictions)
      .filter(([, v]) => v.allowed)
      .map(([k]) => k as CancellationPolicy);

    return { policies, restrictions };
  }

  private getNonRefundableRestrictionReason(
    verificationOk: boolean,
    avgRating: number,
    completedAsHost: number,
  ): string {
    const reasons: string[] = [];
    if (!verificationOk) reasons.push('verificación de identidad');
    if (avgRating < 4.0)
      reasons.push(`valoración media >= 4.0 (actual: ${avgRating.toFixed(1)})`);
    if (completedAsHost < 3)
      reasons.push(`3+ experiencias completadas (actual: ${completedAsHost})`);
    return `Requiere: ${reasons.join(', ')}`;
  }
}
