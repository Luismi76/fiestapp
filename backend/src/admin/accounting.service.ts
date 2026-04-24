import { Injectable } from '@nestjs/common';
import { Prisma, TransactionStatus } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformConfigService } from '../platform-config/platform-config.service';

type XlsxCell = string | number;

// ============================================
// Interfaces
// ============================================

export interface PeriodMetrics {
  totalCommissions: number;
  totalPackPurchases: number;
  totalExperiencePayments: number;
  totalRefunds: number;
  totalWalletBalance: number;
  // Payment plans (reservas con depósito)
  depositPaidCount: number;
  depositPaidAmount: number;
  balancePendingCount: number;
  balancePendingAmount: number;
  transactionCount: number;
  activeHosts: number;
  activeGuests: number;
}

export interface DashboardKpi extends PeriodMetrics {
  previousPeriod: PeriodMetrics;
  changes: {
    totalCommissions: number;
    totalPackPurchases: number;
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
  fiscalPostalCode: string | null;
  city: string | null;
  residenceCountry: string | null;
  birthDate: string | null; // ISO yyyy-mm-dd
  totalIncome: number;
  operationCount: number;
  totalFeesPaid: number;
  missingData: boolean;
  belowThreshold: boolean; // true si NO llega a >30 operaciones o >2.000 €
}

export interface Dac7Report {
  hosts: Dac7Host[];
  summary: {
    totalHosts: number;
    reportableHosts: number;
    hostsWithIncompleteData: number;
    totalReportableIncome: number;
  };
}

/**
 * Umbrales DAC7 (Directiva UE 2021/514, art. 2 anexo V sección I.C):
 *   - Reportable si el vendedor realiza ≥30 actividades relevantes al año, o
 *   - la remuneración total anual ≥ 2.000 €.
 * Por debajo de ambos umbrales, el operador queda eximido de reportar ese host.
 */
const DAC7_THRESHOLD_OPS = 30;
const DAC7_THRESHOLD_INCOME_EUR = 2000;

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
  feesGross: number; // Comisiones brutas (IVA incluido)
  feesNet: number; // Base imponible (comisiones sin IVA) = ingreso real
  vatCollected: number; // IVA repercutido (a declarar a Hacienda)
  totalRefunds: number; // Devoluciones
  netProfit: number; // Base imponible - reembolsos
}

export interface ProfitAndLoss {
  year: number;
  quarter?: number;
  summary: {
    totalFeesGross: number;
    totalFeesNet: number;
    totalVatCollected: number;
    totalRefunds: number;
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
        packPurchases: current.totalPackPurchases,
        packPurchasesChange: this.pctChange(
          previous.totalPackPurchases,
          current.totalPackPurchases,
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
        // Payment plans (reservas con depósito)
        depositPaidCount: current.depositPaidCount,
        depositPaidAmount: current.depositPaidAmount,
        balancePendingCount: current.balancePendingCount,
        balancePendingAmount: current.balancePendingAmount,
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
    Array<{
      period: string;
      revenue: number;
      breakdown: Record<string, number>;
    }>
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
      packPurchases,
      experiencePayments,
      refunds,
      walletBalance,
      transactionCount,
      activeHostIds,
      activeGuestIds,
      depositsPaid,
      balancesPending,
    ] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          type: 'platform_fee',
          status: { in: ['completed', 'held', 'released'] },
          createdAt: dateFilter,
        },
        _sum: { amount: true },
      }),
      // Compras de packs (nuevo sistema) + topups (legacy histórico)
      this.prisma.transaction.aggregate({
        where: {
          type: { in: ['pack_purchase', 'topup'] },
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
      // Payment plans: depósitos pagados en el período
      this.prisma.paymentPlan.aggregate({
        where: {
          depositPaid: true,
          depositPaidAt: dateFilter,
        },
        _sum: { depositAmount: true },
        _count: { id: true },
      }),
      // Payment plans: saldos pendientes (independiente del período, son pagos futuros)
      this.prisma.paymentPlan.aggregate({
        where: {
          status: 'active',
          balancePaid: false,
        },
        _sum: { balanceAmount: true },
        _count: { id: true },
      }),
    ]);

    return {
      totalCommissions: Math.abs(commissions._sum.amount || 0),
      totalPackPurchases: packPurchases._sum.amount || 0,
      totalExperiencePayments: Math.abs(experiencePayments._sum.amount || 0),
      totalRefunds: Math.abs(refunds._sum.amount || 0),
      totalWalletBalance: walletBalance._sum.balance || 0,
      depositPaidCount: depositsPaid._count.id || 0,
      depositPaidAmount: depositsPaid._sum.depositAmount || 0,
      balancePendingCount: balancesPending._count.id || 0,
      balancePendingAmount: balancesPending._sum.balanceAmount || 0,
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
          reportableHosts: 0,
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
        fiscalPostalCode: true,
        city: true,
        residenceCountry: true,
        birthDate: true,
      },
    });

    const hostMap = new Map(hosts.map((h) => [h.id, h]));

    // Los ingresos del host se calculan combinando:
    // - Pagos de experiencia únicos (transactions experience_payment)
    // - Depósitos pagados (paymentPlan.depositPaidAt)
    // - Saldos pagados (paymentPlan.balancePaidAt)
    // Cada uno se filtra por su fecha REAL de cobro, no por createdAt de la tx,
    // para que pagos cruzando años naturales se asignen al año correcto.

    // 1. Refunds del año (para netearlos)
    const refundsInYear = await this.prisma.transaction.findMany({
      where: {
        type: 'refund',
        status: { in: ['completed', 'released'] },
        createdAt: { gte: yearStart, lt: yearEnd },
        matchId: { not: null },
      },
      select: { amount: true, matchId: true },
    });
    const refundsByMatch = new Map<string, number>();
    for (const r of refundsInYear) {
      if (!r.matchId) continue;
      refundsByMatch.set(
        r.matchId,
        (refundsByMatch.get(r.matchId) || 0) + Math.abs(r.amount),
      );
    }

    // 2. Pagos de experiencia ÚNICOS (no payment plans). Solo los que NO tienen
    // un paymentPlan asociado, para evitar doble conteo.
    const singlePayments = await this.prisma.transaction.findMany({
      where: {
        type: 'experience_payment',
        status: { in: ['completed', 'held', 'released'] },
        createdAt: { gte: yearStart, lt: yearEnd },
        matchId: { not: null },
        match: { paymentPlan: null },
      },
      select: { amount: true, matchId: true },
    });

    // 3. Payment plans: depósito pagado en el año
    const depositsInYear = await this.prisma.paymentPlan.findMany({
      where: {
        depositPaid: true,
        depositPaidAt: { gte: yearStart, lt: yearEnd },
        match: { hostId: { in: hostIds } },
      },
      select: {
        depositAmount: true,
        matchId: true,
        match: { select: { hostId: true } },
      },
    });

    // 4. Payment plans: saldo pagado en el año
    const balancesInYear = await this.prisma.paymentPlan.findMany({
      where: {
        balancePaid: true,
        balancePaidAt: { gte: yearStart, lt: yearEnd },
        match: { hostId: { in: hostIds } },
      },
      select: {
        balanceAmount: true,
        matchId: true,
        match: { select: { hostId: true } },
      },
    });

    // 5. Mapear singlePayments → hostId
    const singlePaymentMatchIds = singlePayments
      .map((t) => t.matchId)
      .filter((id): id is string => id !== null);
    const singlePaymentMatches = await this.prisma.match.findMany({
      where: { id: { in: singlePaymentMatchIds }, hostId: { in: hostIds } },
      select: { id: true, hostId: true },
    });
    const singleToHost = new Map(
      singlePaymentMatches.map((m) => [m.id, m.hostId]),
    );

    // 6. Agregar todo (con netting de refunds y operationCount único por match)
    const incomeMap = new Map<
      string,
      { totalIncome: number; operationCount: number; matchIds: Set<string> }
    >();
    const ensure = (hostId: string) => {
      let entry = incomeMap.get(hostId);
      if (!entry) {
        entry = { totalIncome: 0, operationCount: 0, matchIds: new Set() };
        incomeMap.set(hostId, entry);
      }
      return entry;
    };

    for (const tx of singlePayments) {
      if (!tx.matchId) continue;
      const hostId = singleToHost.get(tx.matchId);
      if (!hostId) continue;
      const entry = ensure(hostId);
      const refunded = refundsByMatch.get(tx.matchId) || 0;
      entry.totalIncome += Math.max(0, Math.abs(tx.amount) - refunded);
      entry.matchIds.add(tx.matchId);
    }

    for (const dep of depositsInYear) {
      const hostId = dep.match.hostId;
      const entry = ensure(hostId);
      const refunded = refundsByMatch.get(dep.matchId) || 0;
      // Aplicamos refund proporcional al depósito
      entry.totalIncome += Math.max(0, dep.depositAmount - refunded);
      entry.matchIds.add(dep.matchId);
    }

    for (const bal of balancesInYear) {
      const hostId = bal.match.hostId;
      const entry = ensure(hostId);
      // El refund ya se aplicó al depósito; aquí solo añadimos el saldo
      // (en cancelaciones después del cobro del saldo el refund cubre ambos)
      entry.totalIncome += bal.balanceAmount;
      entry.matchIds.add(bal.matchId);
    }

    // operationCount = número de matches únicos con ingresos (no doble conteo
    // entre depósito y saldo del mismo match)
    for (const entry of incomeMap.values()) {
      entry.operationCount = entry.matchIds.size;
    }

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

        const belowThreshold =
          income.operationCount < DAC7_THRESHOLD_OPS &&
          income.totalIncome < DAC7_THRESHOLD_INCOME_EUR;

        return {
          userId: user.id,
          name: user.name,
          email: user.email,
          taxId: user.taxId,
          taxIdVerified: user.taxIdVerified,
          bankAccount: user.bankAccount,
          fiscalAddress: user.fiscalAddress,
          fiscalPostalCode: user.fiscalPostalCode,
          city: user.city,
          residenceCountry: user.residenceCountry,
          birthDate: user.birthDate
            ? user.birthDate.toISOString().slice(0, 10)
            : null,
          totalIncome: income.totalIncome,
          operationCount: income.operationCount,
          totalFeesPaid,
          missingData:
            !user.taxId ||
            !user.bankAccount ||
            !user.birthDate ||
            !user.residenceCountry,
          belowThreshold,
        };
      })
      .filter((h): h is Dac7Host => h !== null)
      .sort((a, b) => b.totalIncome - a.totalIncome);

    const reportableHosts = dac7Hosts.filter((h) => !h.belowThreshold).length;
    const hostsWithIncompleteData = dac7Hosts.filter(
      (h) => h.missingData && !h.belowThreshold,
    ).length;
    const totalReportableIncome = dac7Hosts
      .filter((h) => !h.belowThreshold)
      .reduce((sum, h) => sum + h.totalIncome, 0);

    return {
      hosts: dac7Hosts,
      summary: {
        totalHosts: dac7Hosts.length,
        reportableHosts,
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

    // Modelo 347: solo operaciones con FiestApp (packs, comisiones, refunds).
    // Los experience_payment NO cuentan porque con Destination Charges el dinero
    // va directo del viajero al anfitrión vía Stripe, sin pasar por FiestApp.
    const annualTotals = await this.prisma.transaction.groupBy({
      by: ['userId'],
      where: {
        type: { in: ['pack_purchase', 'platform_fee', 'refund', 'topup'] },
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
            type: { in: ['pack_purchase', 'platform_fee', 'refund', 'topup'] },
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
    // - platform_fee: Comisión de intermediación = prestación de servicio gravada → IVA incluido, desglosar base + IVA
    // - pack_purchase: Venta de pack (comisión agrupada) = prestación de servicio gravada → IVA incluido
    // - topup (legacy): Anticipo/depósito en monedero → sin IVA (no es hecho imponible)
    // - experience_payment: Ingreso del anfitrión → no entra por FiestApp (Destination Charge), sin IVA nuestro
    // - refund: Rectificación/devolución → sin IVA
    const TYPES_WITH_VAT = new Set(['platform_fee', 'pack_purchase']);

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

    const statusFilter = {
      in: ['completed', 'held', 'released'] as TransactionStatus[],
    };

    const quarters: ProfitAndLossQuarter[] = await Promise.all(
      boundaries.map(async (qb) => {
        const dateFilter = { gte: qb.start, lt: qb.end };

        // Los ingresos reales de FiestApp son las compras de packs (que incluyen
        // las comisiones agrupadas). Los 'platform_fee' son descuentos de créditos
        // ya comprados, no nuevo dinero. Se incluye 'topup' para compatibilidad histórica.
        const [packRevenue, refunds] = await Promise.all([
          this.prisma.transaction.aggregate({
            where: {
              type: { in: ['pack_purchase', 'topup'] },
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

        // Ingresos = compras de packs (IVA incluido)
        const feesGross = Math.abs(packRevenue._sum?.amount || 0);
        const feesNet = Math.round((feesGross / (1 + vatRate)) * 100) / 100;
        const vatCollected = Math.round((feesGross - feesNet) * 100) / 100;

        const totalRefunds = Math.abs(refunds._sum?.amount || 0);

        // Beneficio neto = base imponible - reembolsos
        const netProfit = Math.round((feesNet - totalRefunds) * 100) / 100;

        return {
          quarter: qb.quarter,
          label: qb.label,
          feesGross,
          feesNet,
          vatCollected,
          totalRefunds,
          netProfit,
        };
      }),
    );

    const summary = quarters.reduce(
      (acc, q) => ({
        totalFeesGross:
          Math.round((acc.totalFeesGross + q.feesGross) * 100) / 100,
        totalFeesNet: Math.round((acc.totalFeesNet + q.feesNet) * 100) / 100,
        totalVatCollected:
          Math.round((acc.totalVatCollected + q.vatCollected) * 100) / 100,
        totalRefunds:
          Math.round((acc.totalRefunds + q.totalRefunds) * 100) / 100,
        netProfit: Math.round((acc.netProfit + q.netProfit) * 100) / 100,
      }),
      {
        totalFeesGross: 0,
        totalFeesNet: 0,
        totalVatCollected: 0,
        totalRefunds: 0,
        netProfit: 0,
      },
    );

    return { year, quarter, summary, quarters };
  }

  async exportPnlXlsx(year: number): Promise<Buffer> {
    const pnl = await this.getProfitAndLoss(year);

    const headers = [
      'Trimestre',
      'Comisiones (IVA incl.)',
      'Base imponible',
      'IVA repercutido',
      'Reembolsos',
      'Beneficio neto',
    ];
    const rows: XlsxCell[][] = pnl.quarters.map((q) => [
      q.label,
      q.feesGross,
      q.feesNet,
      q.vatCollected,
      q.totalRefunds,
      q.netProfit,
    ]);
    rows.push([
      'TOTAL',
      pnl.summary.totalFeesGross,
      pnl.summary.totalFeesNet,
      pnl.summary.totalVatCollected,
      pnl.summary.totalRefunds,
      pnl.summary.netProfit,
    ]);

    return this.buildXlsx(`PyL ${year}`, headers, rows, {
      currencyColumns: [2, 3, 4, 5, 6],
      totalsLastRow: true,
    });
  }

  // ============================================
  // Xlsx Exports
  // ============================================

  async exportVatSummaryXlsx(year: number, quarter?: number): Promise<Buffer> {
    const data = await this.getVatSummary(year, quarter);
    const typeLabels: Record<string, string> = {
      platform_fee: 'Comisiones de intermediación',
      pack_purchase: 'Venta de packs',
      topup: 'Recargas monedero (legacy)',
      experience_payment: 'Pagos experiencias',
      payment: 'Pagos (escrow)',
      refund: 'Reembolsos',
    };

    const headers = [
      'Concepto',
      'N. Operaciones',
      'Importe Bruto',
      'Base Imponible',
      `IVA (${data.vatRate}%)`,
    ];
    const rows: XlsxCell[][] = data.lines.map((line) => [
      typeLabels[line.type] || line.type,
      line.count,
      line.grossAmount,
      line.netAmount,
      line.vatAmount,
    ]);
    rows.push([
      'TOTAL',
      data.totals.count,
      data.totals.grossAmount,
      data.totals.netAmount,
      data.totals.vatAmount,
    ]);

    const sheetName = quarter ? `IVA ${year} Q${quarter}` : `IVA ${year}`;
    return this.buildXlsx(sheetName, headers, rows, {
      currencyColumns: [3, 4, 5],
      totalsLastRow: true,
    });
  }

  async exportDac7Xlsx(
    year: number,
    options: { onlyReportable?: boolean } = {},
  ): Promise<Buffer> {
    const report = await this.getDac7Report(year);
    const hosts = options.onlyReportable
      ? report.hosts.filter((h) => !h.belowThreshold)
      : report.hosts;

    const headers = [
      'NIF/NIE',
      'NIF verificado',
      'Nombre',
      'Email',
      'Fecha nacimiento',
      'Dirección fiscal',
      'CP',
      'Ciudad',
      'País residencia',
      'IBAN',
      'Ingresos totales',
      'Núm. operaciones',
      'Comisiones pagadas',
      'Reportable DAC7',
      'Datos completos',
    ];

    const rows: XlsxCell[][] = hosts.map((host) => [
      host.taxId || '',
      host.taxIdVerified ? 'Sí' : 'No',
      host.name,
      host.email,
      host.birthDate || '',
      host.fiscalAddress || '',
      host.fiscalPostalCode || '',
      host.city || '',
      host.residenceCountry || '',
      host.bankAccount || '',
      host.totalIncome,
      host.operationCount,
      host.totalFeesPaid,
      host.belowThreshold ? 'No (bajo umbral)' : 'Sí',
      host.missingData ? 'No' : 'Sí',
    ]);

    return this.buildXlsx(`DAC7 ${year}`, headers, rows, {
      currencyColumns: [11, 13],
    });
  }

  async exportModelo347Xlsx(year: number): Promise<Buffer> {
    const entries = await this.getModelo347Report(year);

    const headers = ['NIF', 'Nombre', 'Total Anual', 'Q1', 'Q2', 'Q3', 'Q4'];

    const rows: XlsxCell[][] = entries.map((entry) => [
      entry.taxId || '',
      entry.name,
      entry.totalAmount,
      entry.q1,
      entry.q2,
      entry.q3,
      entry.q4,
    ]);

    return this.buildXlsx(`Modelo 347 ${year}`, headers, rows, {
      currencyColumns: [3, 4, 5, 6, 7],
    });
  }

  private async buildXlsx(
    sheetName: string,
    headers: string[],
    rows: XlsxCell[][],
    options: {
      currencyColumns?: number[];
      totalsLastRow?: boolean;
    } = {},
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FiestApp';
    workbook.created = new Date();

    const safeName = sheetName.replace(/[\\/*?:[\]]/g, '').slice(0, 31);
    const sheet = workbook.addWorksheet(safeName || 'Sheet1');

    const headerRow = sheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF6B35' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 22;

    rows.forEach((row) => sheet.addRow(row));

    const currencyFormat = '#,##0.00\\ "€"';
    const currencyCols = new Set(options.currencyColumns ?? []);
    headers.forEach((_, idx) => {
      const colNumber = idx + 1;
      const column = sheet.getColumn(colNumber);
      if (currencyCols.has(colNumber)) {
        column.numFmt = currencyFormat;
      }
    });

    sheet.columns.forEach((column) => {
      let maxLength = 10;
      column.eachCell?.({ includeEmpty: false }, (cell) => {
        const value =
          cell.value === null || cell.value === undefined
            ? ''
            : String(cell.value);
        if (value.length > maxLength) {
          maxLength = value.length;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    });

    if (options.totalsLastRow && rows.length > 0) {
      const totalsRowNumber = rows.length + 1;
      const totalsRow = sheet.getRow(totalsRowNumber);
      totalsRow.font = { bold: true };
      totalsRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' },
      };
    }

    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer as ArrayBuffer);
  }
}
