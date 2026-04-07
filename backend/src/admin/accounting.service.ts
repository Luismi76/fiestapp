import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformConfigService } from '../platform-config/platform-config.service';

// ============================================
// Interfaces
// ============================================

export interface PeriodMetrics {
  totalCommissions: number;
  totalTopups: number;
  totalExperiencePayments: number;
  totalRefunds: number;
  totalWalletBalance: number;
  transactionCount: number;
  activeHosts: number;
  activeGuests: number;
}

export interface DashboardKpi extends PeriodMetrics {
  previousPeriod: PeriodMetrics;
  changes: {
    totalCommissions: number;
    totalTopups: number;
    totalExperiencePayments: number;
    totalRefunds: number;
    totalWalletBalance: number;
    transactionCount: number;
    activeHosts: number;
    activeGuests: number;
  };
}

export interface Dac7Host {
  userId: string;
  name: string;
  email: string;
  taxId: string | null;
  taxIdVerified: boolean;
  bankAccount: string | null;
  fiscalAddress: string | null;
  city: string | null;
  totalIncome: number;
  operationCount: number;
  totalFeesPaid: number;
  missingData: boolean;
}

export interface Dac7Report {
  hosts: Dac7Host[];
  summary: {
    totalHosts: number;
    hostsWithIncompleteData: number;
    totalReportableIncome: number;
  };
}

export interface Modelo347Entry {
  userId: string;
  name: string;
  email: string;
  taxId: string | null;
  totalAmount: number;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
}

export interface VatLine {
  type: string;
  count: number;
  grossAmount: number;
  netAmount: number;
  vatAmount: number;
}

export interface VatSummary {
  lines: VatLine[];
  totals: VatLine;
  vatRate: number;
}

export interface ProfitAndLossQuarter {
  quarter: number;
  label: string;
  platformFees: number;       // Importe bruto (IVA incluido)
  platformFeesNet: number;    // Base imponible
  platformFeesVat: number;    // IVA de comisiones
  vatCollected: number;       // IVA total (comisiones + recargas)
  totalRefunds: number;
  grossRevenue: number;
  netProfit: number;
}

export interface ProfitAndLoss {
  year: number;
  quarter?: number;
  summary: {
    totalPlatformFees: number;       // Importe bruto (IVA incluido)
    totalPlatformFeesNet: number;    // Base imponible comisiones
    totalPlatformFeesVat: number;    // IVA comisiones
    totalVatCollected: number;       // IVA total (comisiones + recargas)
    totalRefunds: number;
    grossRevenue: number;
    netProfit: number;
  };
  quarters: ProfitAndLossQuarter[];
}

// ============================================
// Service
// ============================================

@Injectable()
export class AccountingService {
  constructor(
    private prisma: PrismaService,
    private platformConfig: PlatformConfigService,
  ) {}

  // ============================================
  // Dashboard KPIs
  // ============================================

  async getAccountingDashboard(
    startDate?: string,
    endDate?: string,
    granularity: string = 'monthly',
  ) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const periodLength = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime());
    const prevStart = new Date(start.getTime() - periodLength);

    const [current, previous, revenueChart] = await Promise.all([
      this.computePeriodMetrics(start, end),
      this.computePeriodMetrics(prevStart, prevEnd),
      this.computeRevenueChart(
        start,
        end,
        granularity as 'daily' | 'weekly' | 'monthly',
      ),
    ]);

    return {
      kpis: {
        platformFees: current.totalCommissions,
        platformFeesChange: this.pctChange(
          previous.totalCommissions,
          current.totalCommissions,
        ),
        walletTopups: current.totalTopups,
        walletTopupsChange: this.pctChange(
          previous.totalTopups,
          current.totalTopups,
        ),
        experiencePayments: current.totalExperiencePayments,
        experiencePaymentsChange: this.pctChange(
          previous.totalExperiencePayments,
          current.totalExperiencePayments,
        ),
        refunds: current.totalRefunds,
        refundsChange: this.pctChange(
          previous.totalRefunds,
          current.totalRefunds,
        ),
        totalWalletBalance: current.totalWalletBalance,
        operationsCount: current.transactionCount,
        operationsCountChange: this.pctChange(
          previous.transactionCount,
          current.transactionCount,
        ),
      },
      revenueChart,
    };
  }

  private async computeRevenueChart(
    start: Date,
    end: Date,
    granularity: 'daily' | 'weekly' | 'monthly',
  ): Promise<
    Array<{ period: string; revenue: number; breakdown: Record<string, number> }>
  > {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        status: { in: ['completed', 'held', 'released'] },
        createdAt: { gte: start, lt: end },
      },
      select: { amount: true, createdAt: true, type: true },
      orderBy: { createdAt: 'asc' },
    });

    const grouped = new Map<
      string,
      { total: number; byType: Record<string, number> }
    >();
    for (const t of transactions) {
      const date = new Date(t.createdAt);
      let key: string;
      if (granularity === 'daily') {
        key = date.toISOString().split('T')[0];
      } else if (granularity === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      const entry = grouped.get(key) || { total: 0, byType: {} };
      const abs = Math.abs(t.amount);
      entry.total += abs;
      entry.byType[t.type] = (entry.byType[t.type] || 0) + abs;
      grouped.set(key, entry);
    }

    return Array.from(grouped.entries())
      .map(([period, data]) => ({
        period,
        revenue: Math.round(data.total * 100) / 100,
        breakdown: Object.fromEntries(
          Object.entries(data.byType).map(([k, v]) => [
            k,
            Math.round(v * 100) / 100,
          ]),
        ),
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  private async computePeriodMetrics(
    start: Date,
    end: Date,
  ): Promise<PeriodMetrics> {
    const dateFilter: Prisma.DateTimeFilter = { gte: start, lt: end };
    const matchDateFilter: Prisma.DateTimeFilter = { gte: start, lt: end };

    const [
      commissions,
      topups,
      experiencePayments,
      refunds,
      walletBalance,
      transactionCount,
      activeHostIds,
      activeGuestIds,
    ] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          type: 'platform_fee',
          status: { in: ['completed', 'held', 'released'] },
          createdAt: dateFilter,
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          type: 'topup',
          status: { in: ['completed', 'held', 'released'] },
          createdAt: dateFilter,
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          type: 'experience_payment',
          status: { in: ['completed', 'held', 'released'] },
          createdAt: dateFilter,
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          type: 'refund',
          status: { in: ['completed', 'held', 'released'] },
          createdAt: dateFilter,
        },
        _sum: { amount: true },
      }),
      this.prisma.wallet.aggregate({
        _sum: { balance: true },
      }),
      this.prisma.transaction.count({
        where: {
          status: { in: ['completed', 'held', 'released'] },
          createdAt: dateFilter,
        },
      }),
      this.prisma.match.findMany({
        where: {
          status: { in: ['accepted', 'completed'] },
          createdAt: matchDateFilter,
        },
        select: { hostId: true },
        distinct: ['hostId'],
      }),
      this.prisma.match.findMany({
        where: {
          status: { in: ['accepted', 'completed'] },
          createdAt: matchDateFilter,
        },
        select: { requesterId: true },
        distinct: ['requesterId'],
      }),
    ]);

    return {
      totalCommissions: Math.abs(commissions._sum.amount || 0),
      totalTopups: topups._sum.amount || 0,
      totalExperiencePayments: Math.abs(experiencePayments._sum.amount || 0),
      totalRefunds: Math.abs(refunds._sum.amount || 0),
      totalWalletBalance: walletBalance._sum.balance || 0,
      transactionCount,
      activeHosts: activeHostIds.length,
      activeGuests: activeGuestIds.length,
    };
  }

  private pctChange(previous: number, current: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return (
      Math.round(((current - previous) / Math.abs(previous)) * 10000) / 100
    );
  }

  // ============================================
  // DAC7 Report
  // ============================================

  async getDac7Report(year: number): Promise<Dac7Report> {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    const matchesInYear = await this.prisma.match.findMany({
      where: {
        createdAt: { gte: yearStart, lt: yearEnd },
      },
      select: { hostId: true },
      distinct: ['hostId'],
    });

    const hostIds = matchesInYear.map((m) => m.hostId);

    if (hostIds.length === 0) {
      return {
        hosts: [],
        summary: {
          totalHosts: 0,
          hostsWithIncompleteData: 0,
          totalReportableIncome: 0,
        },
      };
    }

    const hosts = await this.prisma.user.findMany({
      where: { id: { in: hostIds } },
      select: {
        id: true,
        name: true,
        email: true,
        taxId: true,
        taxIdVerified: true,
        bankAccount: true,
        fiscalAddress: true,
        city: true,
      },
    });

    const hostMap = new Map(hosts.map((h) => [h.id, h]));

    const incomeByHost = await this.prisma.transaction.groupBy({
      by: ['userId'],
      where: {
        type: 'experience_payment',
        status: { in: ['completed', 'held', 'released'] },
        createdAt: { gte: yearStart, lt: yearEnd },
        userId: { in: hostIds },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    const incomeMap = new Map(
      incomeByHost.map((row) => [
        row.userId,
        {
          totalIncome: Math.abs(row._sum.amount || 0),
          operationCount: row._count.id,
        },
      ]),
    );

    const feesByHost = await this.prisma.transaction.groupBy({
      by: ['userId'],
      where: {
        type: 'platform_fee',
        status: { in: ['completed', 'held', 'released'] },
        createdAt: { gte: yearStart, lt: yearEnd },
        userId: { in: hostIds },
      },
      _sum: { amount: true },
    });

    const feeMap = new Map(
      feesByHost.map((row) => [row.userId, Math.abs(row._sum.amount || 0)]),
    );

    const dac7Hosts: Dac7Host[] = hostIds
      .map((hostId) => {
        const user = hostMap.get(hostId);
        if (!user) return null;

        const income = incomeMap.get(hostId) || {
          totalIncome: 0,
          operationCount: 0,
        };
        const totalFeesPaid = feeMap.get(hostId) || 0;

        return {
          userId: user.id,
          name: user.name,
          email: user.email,
          taxId: user.taxId,
          taxIdVerified: user.taxIdVerified,
          bankAccount: user.bankAccount,
          fiscalAddress: user.fiscalAddress,
          city: user.city,
          totalIncome: income.totalIncome,
          operationCount: income.operationCount,
          totalFeesPaid,
          missingData: !user.taxId || !user.bankAccount,
        };
      })
      .filter((h): h is Dac7Host => h !== null)
      .sort((a, b) => b.totalIncome - a.totalIncome);

    const hostsWithIncompleteData = dac7Hosts.filter(
      (h) => h.missingData,
    ).length;
    const totalReportableIncome = dac7Hosts.reduce(
      (sum, h) => sum + h.totalIncome,
      0,
    );

    return {
      hosts: dac7Hosts,
      summary: {
        totalHosts: dac7Hosts.length,
        hostsWithIncompleteData,
        totalReportableIncome,
      },
    };
  }

  // ============================================
  // Modelo 347 Report
  // ============================================

  async getModelo347Report(year: number): Promise<Modelo347Entry[]> {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    const quarterBoundaries = [
      { start: new Date(year, 0, 1), end: new Date(year, 3, 1) },
      { start: new Date(year, 3, 1), end: new Date(year, 6, 1) },
      { start: new Date(year, 6, 1), end: new Date(year, 9, 1) },
      { start: new Date(year, 9, 1), end: new Date(year + 1, 0, 1) },
    ];

    const annualTotals = await this.prisma.transaction.groupBy({
      by: ['userId'],
      where: {
        status: { in: ['completed', 'held', 'released'] },
        createdAt: { gte: yearStart, lt: yearEnd },
      },
      _sum: { amount: true },
    });

    const qualifyingUserIds = annualTotals
      .filter((row) => Math.abs(row._sum.amount || 0) > 3005.06)
      .map((row) => row.userId);

    if (qualifyingUserIds.length === 0) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: qualifyingUserIds } },
      select: { id: true, name: true, email: true, taxId: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));
    const annualMap = new Map(
      annualTotals
        .filter((row) => qualifyingUserIds.includes(row.userId))
        .map((row) => [row.userId, Math.abs(row._sum.amount || 0)]),
    );

    const quarterlyData = await Promise.all(
      quarterBoundaries.map((q) =>
        this.prisma.transaction.groupBy({
          by: ['userId'],
          where: {
            status: { in: ['completed', 'held', 'released'] },
            userId: { in: qualifyingUserIds },
            createdAt: { gte: q.start, lt: q.end },
          },
          _sum: { amount: true },
        }),
      ),
    );

    const quarterMaps = quarterlyData.map(
      (qData) =>
        new Map(
          qData.map((row) => [row.userId, Math.abs(row._sum.amount || 0)]),
        ),
    );

    return qualifyingUserIds
      .map((userId) => {
        const user = userMap.get(userId);
        if (!user) return null;

        return {
          userId: user.id,
          name: user.name,
          email: user.email,
          taxId: user.taxId,
          totalAmount: annualMap.get(userId) || 0,
          q1: quarterMaps[0].get(userId) || 0,
          q2: quarterMaps[1].get(userId) || 0,
          q3: quarterMaps[2].get(userId) || 0,
          q4: quarterMaps[3].get(userId) || 0,
        };
      })
      .filter((e): e is Modelo347Entry => e !== null)
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }

  // ============================================
  // VAT Summary
  // ============================================

  async getVatSummary(year: number, quarter?: number): Promise<VatSummary> {
    const vatRate = this.platformConfig.vatRate;

    let start: Date;
    let end: Date;

    if (quarter && quarter >= 1 && quarter <= 4) {
      const startMonth = (quarter - 1) * 3;
      start = new Date(year, startMonth, 1);
      end = new Date(year, startMonth + 3, 1);
    } else {
      start = new Date(year, 0, 1);
      end = new Date(year + 1, 0, 1);
    }

    const grouped = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: {
        status: { in: ['completed', 'held', 'released'] },
        createdAt: { gte: start, lt: end },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    // Tratamiento fiscal (comisionista en nombre ajeno, Art. 11 LIVA):
    // - topup: Recarga de monedero = ingreso de intermediación con IVA → desglosar base + IVA
    // - platform_fee: Detracción interna sobre saldo que YA tributó en la recarga → sin IVA
    //   (el IVA de la comisión ya se recaudó cuando el usuario recargó su monedero)
    // - payment/experience_payment: Depósito en garantía, ingreso del anfitrión → sin IVA
    // - refund: Rectificación/devolución → sin IVA
    const TYPES_WITH_VAT = new Set(['topup']);

    const lines: VatLine[] = grouped.map((row) => {
      const grossAmount = Math.abs(row._sum.amount || 0);
      const hasVat = TYPES_WITH_VAT.has(row.type);
      const netAmount = hasVat
        ? Math.round((grossAmount / (1 + vatRate)) * 100) / 100
        : grossAmount;
      const vatAmount = hasVat
        ? Math.round((grossAmount - netAmount) * 100) / 100
        : 0;

      return {
        type: row.type,
        count: row._count.id,
        grossAmount,
        netAmount,
        vatAmount,
      };
    });

    const totals: VatLine = lines.reduce(
      (acc, line) => ({
        type: 'TOTAL',
        count: acc.count + line.count,
        grossAmount:
          Math.round((acc.grossAmount + line.grossAmount) * 100) / 100,
        netAmount: Math.round((acc.netAmount + line.netAmount) * 100) / 100,
        vatAmount: Math.round((acc.vatAmount + line.vatAmount) * 100) / 100,
      }),
      { type: 'TOTAL', count: 0, grossAmount: 0, netAmount: 0, vatAmount: 0 },
    );

    return {
      lines,
      totals,
      vatRate: vatRate * 100,
    };
  }

  // ============================================
  // Profit & Loss (Cuenta de Resultados)
  // ============================================

  async getProfitAndLoss(
    year: number,
    quarter?: number,
  ): Promise<ProfitAndLoss> {
    const vatRate = this.platformConfig.vatRate;

    const quarterBoundaries = [
      {
        quarter: 1,
        label: 'Q1 (Ene-Mar)',
        start: new Date(year, 0, 1),
        end: new Date(year, 3, 1),
      },
      {
        quarter: 2,
        label: 'Q2 (Abr-Jun)',
        start: new Date(year, 3, 1),
        end: new Date(year, 6, 1),
      },
      {
        quarter: 3,
        label: 'Q3 (Jul-Sep)',
        start: new Date(year, 6, 1),
        end: new Date(year, 9, 1),
      },
      {
        quarter: 4,
        label: 'Q4 (Oct-Dic)',
        start: new Date(year, 9, 1),
        end: new Date(year + 1, 0, 1),
      },
    ];

    const boundaries =
      quarter && quarter >= 1 && quarter <= 4
        ? quarterBoundaries.filter((q) => q.quarter === quarter)
        : quarterBoundaries;

    const statusFilter = { in: ['completed', 'held', 'released'] };

    const quarters: ProfitAndLossQuarter[] = await Promise.all(
      boundaries.map(async (qb) => {
        const dateFilter = { gte: qb.start, lt: qb.end };

        const [fees, topups, refunds] = await Promise.all([
          this.prisma.transaction.aggregate({
            where: {
              type: 'platform_fee',
              status: statusFilter,
              createdAt: dateFilter,
            },
            _sum: { amount: true },
          }),
          this.prisma.transaction.aggregate({
            where: {
              type: 'topup',
              status: statusFilter,
              createdAt: dateFilter,
            },
            _sum: { amount: true },
          }),
          this.prisma.transaction.aggregate({
            where: {
              type: 'refund',
              status: statusFilter,
              createdAt: dateFilter,
            },
            _sum: { amount: true },
          }),
        ]);

        // Comisiones: detracción interna, el IVA ya se recaudó en la recarga
        const platformFees = Math.abs(fees._sum?.amount || 0);

        // Recargas: ingreso con IVA → desglosar para saber cuánto IVA se recaudó
        const topupGross = topups._sum?.amount || 0;
        const topupNet =
          Math.round((topupGross / (1 + vatRate)) * 100) / 100;
        const vatCollected =
          Math.round((topupGross - topupNet) * 100) / 100;

        const totalRefunds = Math.abs(refunds._sum?.amount || 0);

        // Ingreso bruto = comisiones + IVA recaudado en recargas
        const grossRevenue =
          Math.round((platformFees + vatCollected) * 100) / 100;

        // Beneficio neto = comisiones - reembolsos
        const netProfit =
          Math.round((platformFees - totalRefunds) * 100) / 100;

        return {
          quarter: qb.quarter,
          label: qb.label,
          platformFees,
          platformFeesNet: platformFees, // sin IVA adicional (ya tributó en recarga)
          platformFeesVat: 0,            // IVA = 0 porque ya se cobró en la recarga
          vatCollected,
          totalRefunds,
          grossRevenue,
          netProfit,
        };
      }),
    );

    const summary = quarters.reduce(
      (acc, q) => ({
        totalPlatformFees:
          Math.round((acc.totalPlatformFees + q.platformFees) * 100) / 100,
        totalPlatformFeesNet:
          Math.round((acc.totalPlatformFeesNet + q.platformFeesNet) * 100) / 100,
        totalPlatformFeesVat:
          Math.round((acc.totalPlatformFeesVat + q.platformFeesVat) * 100) / 100,
        totalVatCollected:
          Math.round((acc.totalVatCollected + q.vatCollected) * 100) / 100,
        totalRefunds:
          Math.round((acc.totalRefunds + q.totalRefunds) * 100) / 100,
        grossRevenue:
          Math.round((acc.grossRevenue + q.grossRevenue) * 100) / 100,
        netProfit: Math.round((acc.netProfit + q.netProfit) * 100) / 100,
      }),
      {
        totalPlatformFees: 0,
        totalPlatformFeesNet: 0,
        totalPlatformFeesVat: 0,
        totalVatCollected: 0,
        totalRefunds: 0,
        grossRevenue: 0,
        netProfit: 0,
      },
    );

    return { year, quarter, summary, quarters };
  }

  async exportPnlCsv(year: number): Promise<string> {
    const pnl = await this.getProfitAndLoss(year);

    const headers = [
      'Trimestre',
      'Comisiones',
      'IVA Recaudado (recargas)',
      'Reembolsos',
      'Ingreso Bruto',
      'Beneficio Neto',
    ];
    const rows = pnl.quarters.map((q) => [
      q.label,
      q.platformFees.toFixed(2),
      q.vatCollected.toFixed(2),
      q.totalRefunds.toFixed(2),
      q.grossRevenue.toFixed(2),
      q.netProfit.toFixed(2),
    ]);
    rows.push([
      'TOTAL',
      pnl.summary.totalPlatformFees.toFixed(2),
      pnl.summary.totalVatCollected.toFixed(2),
      pnl.summary.totalRefunds.toFixed(2),
      pnl.summary.grossRevenue.toFixed(2),
      pnl.summary.netProfit.toFixed(2),
    ]);

    return this.buildCsv(headers, rows);
  }

  // ============================================
  // CSV Exports
  // ============================================

  async exportVatSummaryCsv(
    year: number,
    quarter?: number,
  ): Promise<string> {
    const data = await this.getVatSummary(year, quarter);
    const typeLabels: Record<string, string> = {
      platform_fee: 'Comisiones plataforma',
      topup: 'Recargas wallet',
      experience_payment: 'Pagos experiencias',
      payment: 'Pagos (escrow)',
      refund: 'Reembolsos',
    };

    const headers = [
      'Concepto',
      'N. Operaciones',
      'Importe Bruto',
      'Base Imponible',
      'IVA (21%)',
    ];
    const rows = data.lines.map((line) => [
      typeLabels[line.type] || line.type,
      line.count.toString(),
      line.grossAmount.toFixed(2),
      line.netAmount.toFixed(2),
      line.vatAmount.toFixed(2),
    ]);
    rows.push([
      'TOTAL',
      data.totals.count.toString(),
      data.totals.grossAmount.toFixed(2),
      data.totals.netAmount.toFixed(2),
      data.totals.vatAmount.toFixed(2),
    ]);

    return this.buildCsv(headers, rows);
  }

  async exportDac7Csv(year: number): Promise<string> {
    const report = await this.getDac7Report(year);

    const headers = [
      'NIF',
      'Nombre',
      'Email',
      'Direccion',
      'IBAN',
      'Ingresos Totales',
      'Num Operaciones',
      'Comisiones Pagadas',
    ];

    const rows = report.hosts.map((host) => [
      host.taxId || '',
      host.name,
      host.email,
      host.fiscalAddress || '',
      host.bankAccount || '',
      host.totalIncome.toFixed(2),
      host.operationCount.toString(),
      host.totalFeesPaid.toFixed(2),
    ]);

    return this.buildCsv(headers, rows);
  }

  async exportModelo347Csv(year: number): Promise<string> {
    const entries = await this.getModelo347Report(year);

    const headers = ['NIF', 'Nombre', 'Total Anual', 'Q1', 'Q2', 'Q3', 'Q4'];

    const rows = entries.map((entry) => [
      entry.taxId || '',
      entry.name,
      entry.totalAmount.toFixed(2),
      entry.q1.toFixed(2),
      entry.q2.toFixed(2),
      entry.q3.toFixed(2),
      entry.q4.toFixed(2),
    ]);

    return this.buildCsv(headers, rows);
  }

  private buildCsv(headers: string[], rows: string[][]): string {
    const escapedRows = rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
    );

    return [headers.join(','), ...escapedRows].join('\n');
  }
}
