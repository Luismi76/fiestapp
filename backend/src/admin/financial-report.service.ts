import { Injectable } from '@nestjs/common';
import { Prisma, TransactionType, TransactionStatus } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';

export interface FinancialReportFilters {
  startDate?: Date;
  endDate?: Date;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalTransactions: number;
  avgTransactionAmount: number;
  revenueByType: {
    payment: number; // Pagos de experiencias
    wallet_topup: number; // Recargas de wallet
    commission: number; // Comisiones
    referral_credit: number; // Creditos de referidos
    refund: number; // Reembolsos
  };
  transactionsByStatus: {
    completed: number;
    pending: number;
    failed: number;
    refunded: number;
  };
}

@Injectable()
export class FinancialReportService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtiene resumen financiero general
   */
  async getFinancialSummary(
    filters?: FinancialReportFilters,
  ): Promise<FinancialSummary> {
    const where: Prisma.TransactionWhereInput = {};

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate)
        (where.createdAt as Prisma.DateTimeFilter).gte = filters.startDate;
      if (filters.endDate)
        (where.createdAt as Prisma.DateTimeFilter).lte = filters.endDate;
    }

    // Obtener totales
    const [totalStats, byType, byStatus] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { ...where, status: { in: ['completed', 'held', 'released'] } },
        _sum: { amount: true },
        _count: { amount: true },
        _avg: { amount: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['type'],
        where: { ...where, status: { in: ['completed', 'held', 'released'] } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
      }),
    ]);

    // Mapear por tipo
    const revenueByType = {
      payment: 0,
      wallet_topup: 0,
      commission: 0,
      referral_credit: 0,
      refund: 0,
    };
    byType.forEach((t) => {
      if (t.type in revenueByType) {
        revenueByType[t.type as keyof typeof revenueByType] =
          t._sum.amount || 0;
      }
    });

    // Mapear por status
    const transactionsByStatus = {
      completed: 0,
      pending: 0,
      failed: 0,
      refunded: 0,
    };
    byStatus.forEach((s) => {
      if (s.status in transactionsByStatus) {
        transactionsByStatus[s.status as keyof typeof transactionsByStatus] =
          s._count.status;
      }
    });

    return {
      totalRevenue: totalStats._sum.amount || 0,
      totalTransactions: totalStats._count.amount || 0,
      avgTransactionAmount: totalStats._avg.amount || 0,
      revenueByType,
      transactionsByStatus,
    };
  }

  /**
   * Obtiene ingresos por periodo (diario, semanal, mensual)
   */
  async getRevenueByPeriod(
    period: 'daily' | 'weekly' | 'monthly',
    filters?: FinancialReportFilters,
  ) {
    const where: Prisma.TransactionWhereInput = {
      status: { in: ['completed', 'held', 'released'] },
    };

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate)
        (where.createdAt as Prisma.DateTimeFilter).gte = filters.startDate;
      if (filters.endDate)
        (where.createdAt as Prisma.DateTimeFilter).lte = filters.endDate;
    }

    // Obtener transacciones en el rango
    const transactions = await this.prisma.transaction.findMany({
      where,
      select: {
        amount: true,
        createdAt: true,
        type: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Agrupar por periodo
    const grouped = new Map<string, { revenue: number; count: number }>();

    transactions.forEach((t) => {
      let key: string;
      const date = new Date(t.createdAt);

      if (period === 'daily') {
        key = date.toISOString().split('T')[0];
      } else if (period === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      const existing = grouped.get(key) || { revenue: 0, count: 0 };
      existing.revenue += t.amount;
      existing.count += 1;
      grouped.set(key, existing);
    });

    return Array.from(grouped.entries())
      .map(([period, data]) => ({
        period,
        revenue: Math.round(data.revenue * 100) / 100,
        count: data.count,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Obtiene detalle de transacciones
   */
  async getTransactions(
    page = 1,
    limit = 50,
    filters?: FinancialReportFilters & { type?: string; status?: string },
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.TransactionWhereInput = {};

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate)
        (where.createdAt as Prisma.DateTimeFilter).gte = filters.startDate;
      if (filters.endDate)
        (where.createdAt as Prisma.DateTimeFilter).lte = filters.endDate;
    }
    if (filters?.type) where.type = filters.type as TransactionType;
    if (filters?.status) where.status = filters.status as TransactionStatus;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          match: {
            select: {
              id: true,
              status: true,
              paymentStatus: true,
              startDate: true,
              totalPrice: true,
              participants: true,
              createdAt: true,
              experience: {
                select: {
                  id: true,
                  title: true,
                  city: true,
                  cancellationPolicy: true,
                },
              },
              host: { select: { id: true, name: true, email: true } },
              requester: { select: { id: true, name: true, email: true } },
              cancellation: {
                select: {
                  id: true,
                  reason: true,
                  policy: true,
                  originalAmount: true,
                  refundPercentage: true,
                  refundAmount: true,
                  penaltyAmount: true,
                  processedAt: true,
                  createdAt: true,
                  cancelledById: true,
                },
              },
              disputes: {
                select: {
                  id: true,
                  reason: true,
                  status: true,
                  resolution: true,
                  refundAmount: true,
                  refundPercentage: true,
                  resolvedAt: true,
                  createdAt: true,
                },
                orderBy: { createdAt: 'desc' as const },
                take: 1,
              },
            },
          },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Exporta transacciones a formato Excel (.xlsx)
   */
  async exportToXlsx(filters?: FinancialReportFilters): Promise<Buffer> {
    const where: Prisma.TransactionWhereInput = {};

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate)
        (where.createdAt as Prisma.DateTimeFilter).gte = filters.startDate;
      if (filters.endDate)
        (where.createdAt as Prisma.DateTimeFilter).lte = filters.endDate;
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        match: {
          select: {
            id: true,
            paymentStatus: true,
            experience: { select: { title: true, city: true } },
            host: { select: { name: true, email: true } },
            requester: { select: { name: true, email: true } },
            cancellation: { select: { policy: true, refundPercentage: true } },
          },
        },
      },
    });

    const headers = [
      'ID',
      'Fecha',
      'Usuario',
      'Email',
      'Tipo',
      'Monto',
      'Estado',
      'Descripcion',
      'Experiencia',
      'Ciudad',
      'Anfitrion',
      'Viajero',
      'Estado Pago',
      'Politica Cancelacion',
      'Reembolso %',
    ];

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FiestApp';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Transacciones');

    const headerRow = sheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF6B35' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 22;

    transactions.forEach((t) => {
      const row = sheet.addRow([
        t.id,
        t.createdAt,
        t.user?.name || 'N/A',
        t.user?.email || 'N/A',
        t.type,
        Number(t.amount),
        t.status,
        t.description || '',
        t.match?.experience?.title || '',
        t.match?.experience?.city || '',
        t.match?.host?.name || '',
        t.match?.requester?.name || '',
        t.match?.paymentStatus || '',
        t.match?.cancellation?.policy || '',
        t.match?.cancellation?.refundPercentage ?? '',
      ]);
      row.getCell(2).numFmt = 'yyyy-mm-dd hh:mm:ss';
      row.getCell(6).numFmt = '#,##0.00\\ "€"';
      if (typeof row.getCell(15).value === 'number') {
        row.getCell(15).numFmt = '0"%"';
      }
    });

    sheet.columns.forEach((column, idx) => {
      let maxLength = headers[idx]?.length ?? 10;
      column.eachCell?.({ includeEmpty: false }, (cell) => {
        const raw = cell.value;
        const value =
          raw instanceof Date
            ? raw.toISOString().slice(0, 19).replace('T', ' ')
            : raw === null || raw === undefined
              ? ''
              : String(raw);
        if (value.length > maxLength) {
          maxLength = value.length;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    });

    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer as ArrayBuffer);
  }

  /**
   * Obtiene estadisticas de wallets
   */
  async getWalletStats() {
    const stats = await this.prisma.wallet.aggregate({
      _sum: { balance: true },
      _avg: { balance: true },
      _count: { balance: true },
      _max: { balance: true },
    });

    const walletsWithBalance = await this.prisma.wallet.count({
      where: { balance: { gt: 0 } },
    });

    return {
      totalBalance: stats._sum.balance || 0,
      avgBalance: stats._avg.balance || 0,
      totalWallets: stats._count.balance,
      walletsWithBalance,
      maxBalance: stats._max.balance || 0,
    };
  }

  /**
   * Timeline financiero completo de un match: transacciones + cancelación + disputas
   */
  async getMatchTimeline(matchId: string) {
    const [transactions, match] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { matchId },
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.match.findUnique({
        where: { id: matchId },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          startDate: true,
          totalPrice: true,
          participants: true,
          createdAt: true,
          updatedAt: true,
          experience: {
            select: {
              id: true,
              title: true,
              city: true,
              cancellationPolicy: true,
            },
          },
          host: { select: { id: true, name: true, email: true } },
          requester: { select: { id: true, name: true, email: true } },
          cancellation: {
            select: {
              id: true,
              reason: true,
              policy: true,
              originalAmount: true,
              refundPercentage: true,
              refundAmount: true,
              penaltyAmount: true,
              processedAt: true,
              createdAt: true,
              cancelledById: true,
            },
          },
          disputes: {
            select: {
              id: true,
              reason: true,
              status: true,
              resolution: true,
              refundAmount: true,
              refundPercentage: true,
              resolvedAt: true,
              createdAt: true,
              openedBy: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
    ]);

    // Construir timeline unificada
    const events: Array<{ type: string; date: Date; data: unknown }> = [];

    for (const tx of transactions) {
      events.push({ type: 'transaction', date: tx.createdAt, data: tx });
    }

    if (match?.cancellation) {
      events.push({
        type: 'cancellation',
        date: match.cancellation.createdAt,
        data: match.cancellation,
      });
    }

    for (const dispute of match?.disputes || []) {
      events.push({
        type: 'dispute_opened',
        date: dispute.createdAt,
        data: dispute,
      });
      if (dispute.resolvedAt) {
        events.push({
          type: 'dispute_resolved',
          date: dispute.resolvedAt,
          data: dispute,
        });
      }
    }

    events.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    return { match, events };
  }

  /**
   * Obtiene metricas de comisiones
   */
  async getCommissionMetrics(filters?: FinancialReportFilters) {
    const where: Prisma.TransactionWhereInput = {
      type: 'platform_fee',
      status: { in: ['completed', 'held', 'released'] },
    };

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate)
        (where.createdAt as Prisma.DateTimeFilter).gte = filters.startDate;
      if (filters.endDate)
        (where.createdAt as Prisma.DateTimeFilter).lte = filters.endDate;
    }

    const commissions = await this.prisma.transaction.aggregate({
      where,
      _sum: { amount: true },
      _count: { amount: true },
      _avg: { amount: true },
    });

    // Pagos totales para calcular porcentaje de comision
    const payments = await this.prisma.transaction.aggregate({
      where: {
        type: 'experience_payment',
        status: { in: ['completed', 'held', 'released'] },
        ...(where.createdAt ? { createdAt: where.createdAt } : {}),
      },
      _sum: { amount: true },
    });

    const totalPayments = payments._sum.amount || 0;
    const totalCommissions = commissions._sum.amount || 0;
    const effectiveCommissionRate =
      totalPayments > 0 ? (totalCommissions / totalPayments) * 100 : 0;

    return {
      totalCommissions,
      commissionCount: commissions._count.amount || 0,
      avgCommission: commissions._avg.amount || 0,
      effectiveCommissionRate: Math.round(effectiveCommissionRate * 100) / 100,
    };
  }
}
