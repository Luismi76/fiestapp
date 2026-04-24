import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface FiscalPeriodStats {
  period: string;
  year: number;
  quarter: number;
  invoiceCount: number;
  totalGross: number;
  totalNet: number;
  totalTax: number;
}

export interface FiscalPeriodView extends FiscalPeriodStats {
  closed: boolean;
  closedAt: Date | null;
  closedByUserId: string | null;
  closedByName: string | null;
  notes: string | null;
  modelo303Submitted: boolean;
  modelo303SubmittedAt: Date | null;
}

@Injectable()
export class FiscalClosureService {
  private readonly logger = new Logger(FiscalClosureService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Comprueba si un periodo "YYYY-Q#" está cerrado.
   */
  async isPeriodClosed(period: string): Promise<boolean> {
    const existing = await this.prisma.fiscalPeriodClosure.findUnique({
      where: { period },
    });
    return !!existing;
  }

  /**
   * Lanza ForbiddenException si el periodo está cerrado.
   * Se llama antes de emitir cualquier factura con operationDate en ese periodo.
   */
  async assertPeriodOpen(period: string): Promise<void> {
    const closed = await this.isPeriodClosed(period);
    if (closed) {
      throw new ForbiddenException(
        `El periodo fiscal ${period} está cerrado. No se pueden crear ni modificar facturas con fecha de operación en ese periodo. Reábrelo desde el panel admin si es necesario.`,
      );
    }
  }

  /**
   * Calcula estadísticas de un periodo (facturas, base, IVA, total).
   * Sólo tiene en cuenta las facturas emitidas (status ISSUED).
   */
  async computeStats(year: number, quarter: number): Promise<FiscalPeriodStats> {
    const period = `${year}-Q${quarter}`;
    const agg = await this.prisma.invoice.aggregate({
      where: { fiscalPeriod: period, status: 'ISSUED' },
      _count: { id: true },
      _sum: { grossAmount: true, netAmount: true, taxAmount: true },
    });
    return {
      period,
      year,
      quarter,
      invoiceCount: agg._count.id || 0,
      totalGross: agg._sum.grossAmount || 0,
      totalNet: agg._sum.netAmount || 0,
      totalTax: agg._sum.taxAmount || 0,
    };
  }

  /**
   * Lista los últimos N trimestres, con estadísticas y estado de cierre.
   * Incluye el trimestre actual aunque esté abierto y aún no tenga facturas.
   */
  async list(limitQuarters = 8): Promise<FiscalPeriodView[]> {
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentQuarter = (Math.floor(now.getUTCMonth() / 3) + 1) as 1 | 2 | 3 | 4;

    // Generar los últimos N trimestres hacia atrás desde el actual
    const periods: Array<{ year: number; quarter: number }> = [];
    let y = currentYear;
    let q = currentQuarter;
    for (let i = 0; i < limitQuarters; i++) {
      periods.push({ year: y, quarter: q });
      q -= 1;
      if (q === 0) {
        q = 4;
        y -= 1;
      }
    }

    const periodStrings = periods.map((p) => `${p.year}-Q${p.quarter}`);

    const [closures, stats] = await Promise.all([
      this.prisma.fiscalPeriodClosure.findMany({
        where: { period: { in: periodStrings } },
        include: { closedBy: { select: { id: true, name: true } } },
      }),
      Promise.all(periods.map((p) => this.computeStats(p.year, p.quarter))),
    ]);

    const closureMap = new Map(closures.map((c) => [c.period, c]));

    return stats.map((s) => {
      const closure = closureMap.get(s.period);
      return {
        ...s,
        closed: !!closure,
        closedAt: closure?.closedAt ?? null,
        closedByUserId: closure?.closedByUserId ?? null,
        closedByName: closure?.closedBy?.name ?? null,
        notes: closure?.notes ?? null,
        modelo303Submitted: closure?.modelo303Submitted ?? false,
        modelo303SubmittedAt: closure?.modelo303SubmittedAt ?? null,
      };
    });
  }

  async close(params: {
    year: number;
    quarter: number;
    closedByUserId: string;
    notes?: string;
  }) {
    if (params.quarter < 1 || params.quarter > 4) {
      throw new Error('El trimestre debe estar entre 1 y 4');
    }
    const period = `${params.year}-Q${params.quarter}`;

    const existing = await this.prisma.fiscalPeriodClosure.findUnique({
      where: { period },
    });
    if (existing) {
      throw new ConflictException(`El periodo ${period} ya está cerrado`);
    }

    // No permitir cerrar periodos futuros
    const now = new Date();
    const periodStart = new Date(
      Date.UTC(params.year, (params.quarter - 1) * 3, 1),
    );
    const periodEnd = new Date(
      Date.UTC(params.year, params.quarter * 3, 1),
    );
    if (now < periodEnd) {
      throw new ConflictException(
        `No se puede cerrar ${period} antes de que finalice (fin ${periodEnd.toISOString().slice(0, 10)})`,
      );
    }
    // Solo un sanity check: periodStart no debería estar en el futuro
    if (periodStart > now) {
      throw new ConflictException(
        `No se puede cerrar un periodo futuro (${period})`,
      );
    }

    const closure = await this.prisma.fiscalPeriodClosure.create({
      data: {
        period,
        year: params.year,
        quarter: params.quarter,
        closedByUserId: params.closedByUserId,
        notes: params.notes || null,
      },
    });

    this.logger.log(
      `Cierre fiscal: ${period} cerrado por user=${params.closedByUserId}${params.notes ? ` (${params.notes})` : ''}`,
    );
    return closure;
  }

  async reopen(params: {
    period: string;
    reopenedByUserId: string;
    reason: string;
  }) {
    const closure = await this.prisma.fiscalPeriodClosure.findUnique({
      where: { period: params.period },
    });
    if (!closure) {
      throw new NotFoundException(
        `El periodo ${params.period} no está cerrado`,
      );
    }

    await this.prisma.fiscalPeriodClosure.delete({
      where: { period: params.period },
    });

    this.logger.warn(
      `Reapertura fiscal: ${params.period} reabierto por user=${params.reopenedByUserId}. Motivo: ${params.reason}`,
    );
    return { period: params.period, reopenedAt: new Date() };
  }

  async markModelo303Submitted(period: string) {
    const closure = await this.prisma.fiscalPeriodClosure.findUnique({
      where: { period },
    });
    if (!closure) {
      throw new NotFoundException(
        `El periodo ${period} debe estar cerrado antes de marcar el 303 como presentado`,
      );
    }
    return this.prisma.fiscalPeriodClosure.update({
      where: { period },
      data: {
        modelo303Submitted: true,
        modelo303SubmittedAt: new Date(),
      },
    });
  }
}
