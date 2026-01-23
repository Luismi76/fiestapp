import { Injectable } from '@nestjs/common';
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
    const where: any = {};

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    // Obtener totales
    const [totalStats, byType, byStatus] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { ...where, status: 'completed' },
        _sum: { amount: true },
        _count: { amount: true },
        _avg: { amount: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['type'],
        where: { ...where, status: 'completed' },
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
    const where: any = { status: 'completed' };

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
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
    const where: any = {};

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }
    if (filters?.type) where.type = filters.type;
    if (filters?.status) where.status = filters.status;

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
              experience: {
                select: { id: true, title: true },
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
   * Exporta transacciones a formato CSV
   */
  async exportToCSV(filters?: FinancialReportFilters): Promise<string> {
    const where: any = {};

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Generar CSV
    const headers = [
      'ID',
      'Fecha',
      'Usuario',
      'Email',
      'Tipo',
      'Monto',
      'Estado',
      'Descripcion',
    ];
    const rows = transactions.map((t) => [
      t.id,
      t.createdAt.toISOString(),
      t.user?.name || 'N/A',
      t.user?.email || 'N/A',
      t.type,
      t.amount.toString(),
      t.status,
      t.description || '',
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
   * Obtiene metricas de comisiones
   */
  async getCommissionMetrics(filters?: FinancialReportFilters) {
    const where: any = {
      type: 'commission',
      status: 'completed',
    };

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const commissions = await this.prisma.transaction.aggregate({
      where,
      _sum: { amount: true },
      _count: { amount: true },
      _avg: { amount: true },
    });

    // Pagos totales para calcular porcentaje de comision
    const payments = await this.prisma.transaction.aggregate({
      where: { ...where, type: 'payment' },
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
