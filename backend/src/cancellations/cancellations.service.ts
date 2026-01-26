import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CancellationPolicy } from '@prisma/client';

export interface RefundCalculation {
  refundPercentage: number;
  refundAmount: number;
  penaltyAmount: number;
  policy: CancellationPolicy;
  hoursUntilStart: number;
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

  constructor(private prisma: PrismaService) {}

  /**
   * Calcula el reembolso según la política de cancelación
   * @param policy - Política de cancelación de la experiencia
   * @param originalAmount - Monto original pagado
   * @param startDate - Fecha de inicio de la experiencia
   * @param cancelDate - Fecha de cancelación (por defecto ahora)
   */
  calculateRefund(
    policy: CancellationPolicy,
    originalAmount: number,
    startDate: Date,
    cancelDate: Date = new Date(),
  ): RefundCalculation {
    const hoursUntilStart =
      (startDate.getTime() - cancelDate.getTime()) / (1000 * 60 * 60);

    let refundPercentage = 0;

    switch (policy) {
      case CancellationPolicy.FLEXIBLE:
        // 100% hasta 24h antes
        if (hoursUntilStart >= 24) {
          refundPercentage = 100;
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
            'Sin reembolso si cancelas con menos de 24 horas de antelación',
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
            'Sin reembolso si cancelas con menos de 24 horas de antelación',
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
   * Calcula preview del reembolso para mostrar al usuario antes de cancelar
   */
  async previewCancellation(matchId: string): Promise<{
    refund: RefundCalculation;
    policyInfo: ReturnType<typeof this.getPolicyDescription>;
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

    return { refund, policyInfo };
  }
}
