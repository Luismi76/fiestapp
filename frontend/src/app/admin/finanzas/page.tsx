'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import api from '@/lib/api';
import { Suspense } from 'react';

// ============================================
// TYPES & CONSTANTS
// ============================================

interface DashboardKpi {
  platformFees: number;
  platformFeesChange: number;
  walletTopups: number;
  walletTopupsChange: number;
  experiencePayments: number;
  experiencePaymentsChange: number;
  refunds: number;
  refundsChange: number;
  totalWalletBalance: number;
  operationsCount: number;
  operationsCountChange: number;
}

interface RevenueDataPoint {
  period: string;
  revenue: number;
  breakdown?: Record<string, number>;
}

interface WalletStats {
  totalBalance: number;
  avgBalance: number;
  totalWallets: number;
  walletsWithBalance: number;
  maxBalance: number;
}

interface DashboardData {
  kpis: DashboardKpi;
  revenueChart: RevenueDataPoint[];
}

const DEFAULT_KPIS: DashboardKpi = {
  platformFees: 0, platformFeesChange: 0,
  walletTopups: 0, walletTopupsChange: 0,
  experiencePayments: 0, experiencePaymentsChange: 0,
  refunds: 0, refundsChange: 0,
  totalWalletBalance: 0, operationsCount: 0, operationsCountChange: 0,
};

interface MatchContext {
  id: string;
  status: string;
  paymentStatus: string | null;
  startDate: string | null;
  totalPrice: number | null;
  participants: number;
  createdAt: string;
  experience: { id: string; title: string; city: string; cancellationPolicy: string } | null;
  host: { id: string; name: string; email: string } | null;
  requester: { id: string; name: string; email: string } | null;
  cancellation: {
    id: string;
    reason: string | null;
    policy: string;
    originalAmount: number;
    refundPercentage: number;
    refundAmount: number;
    penaltyAmount: number;
    processedAt: string | null;
    createdAt: string;
    cancelledById: string;
  } | null;
  disputes: Array<{
    id: string;
    reason: string;
    status: string;
    resolution: string | null;
    refundAmount: number | null;
    refundPercentage: number | null;
    resolvedAt: string | null;
    createdAt: string;
  }>;
}

interface TimelineEvent {
  type: string;
  date: string;
  data: Record<string, unknown>;
}

interface Transaction {
  id: string;
  date: string;
  userName: string;
  userEmail: string;
  type: string;
  amount: number;
  status: string;
  description: string;
  stripeId: string | null;
  matchId: string | null;
  match: MatchContext | null;
}

interface TransactionsResponse {
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface Dac7Host {
  id: string;
  name: string;
  email: string;
  nif: string | null;
  iban: string | null;
  totalIncome: number;
  operationsCount: number;
  commissionsPaid: number;
}

interface Dac7Response {
  hosts: Dac7Host[];
  summary: {
    totalHosts: number;
    incompleteData: number;
    totalReportableIncome: number;
  };
}

interface Modelo347Entry {
  userId: string;
  userName: string;
  nif: string | null;
  totalAnnual: number;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
}

interface Modelo347Response {
  entries: Modelo347Entry[];
}

interface VatRow {
  concept: string;
  operationsCount: number;
  grossAmount: number;
  taxableBase: number;
  vatAmount: number;
}

interface VatSummaryResponse {
  rows: VatRow[];
  totals: VatRow;
}

// ============================================
// HELPERS
// ============================================

const formatEur = (amount: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const typeBadge: Record<string, { label: string; bg: string; text: string }> = {
  platform_fee: { label: 'Comision', bg: 'bg-purple-100', text: 'text-purple-700' },
  topup: { label: 'Recarga', bg: 'bg-blue-100', text: 'text-blue-700' },
  refund: { label: 'Reembolso', bg: 'bg-amber-100', text: 'text-amber-700' },
  payment: { label: 'Pago', bg: 'bg-green-100', text: 'text-green-700' },
  experience_payment: { label: 'Pago experiencia', bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

const statusBadge: Record<string, { label: string; bg: string; text: string }> = {
  completed: { label: 'Completado', bg: 'bg-green-100', text: 'text-green-700' },
  pending: { label: 'Pendiente', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  cancelled: { label: 'Cancelado', bg: 'bg-gray-100', text: 'text-gray-500' },
  refunded: { label: 'Reembolsado', bg: 'bg-amber-100', text: 'text-amber-700' },
  held: { label: 'Retenido', bg: 'bg-blue-100', text: 'text-blue-700' },
  released: { label: 'Liberado', bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

const typeBorderColor: Record<string, string> = {
  platform_fee: 'border-l-purple-500',
  topup: 'border-l-blue-500',
  refund: 'border-l-amber-500',
  payment: 'border-l-green-500',
  experience_payment: 'border-l-emerald-500',
};

// ============================================
// API
// ============================================

const accountingApi = {
  getDashboard: async (startDate?: string, endDate?: string, granularity?: string): Promise<DashboardData> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (granularity) params.append('granularity', granularity);
    const { data } = await api.get(`/admin/accounting/dashboard?${params}`);
    return data;
  },

  getTransactions: async (
    page: number,
    limit: number,
    filters: { startDate?: string; endDate?: string; type?: string; status?: string; search?: string }
  ): Promise<TransactionsResponse> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.type && filters.type !== 'all') params.append('type', filters.type);
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    const { data } = await api.get(`/admin/reports/financial/transactions?${params}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transactions = (data.data || []).map((t: any) => ({
      id: t.id,
      date: t.createdAt,
      userName: t.user?.name || 'N/A',
      userEmail: t.user?.email || '',
      type: t.type,
      amount: t.amount,
      status: t.status,
      description: t.description || '',
      stripeId: t.stripeId || null,
      matchId: t.matchId || null,
      match: t.match ? {
        ...t.match,
        cancellation: t.match.cancellation || null,
        disputes: t.match.disputes || [],
      } : null,
    }));
    return { transactions, pagination: data.pagination };
  },

  getMatchTimeline: async (matchId: string): Promise<{ match: MatchContext | null; events: TimelineEvent[] }> => {
    const { data } = await api.get(`/admin/reports/financial/match/${matchId}/timeline`);
    return data;
  },

  exportTransactions: (filters: { startDate?: string; endDate?: string; type?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.type && filters.type !== 'all') params.append('type', filters.type);
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    return `/admin/reports/financial/export?${params}`;
  },

  getDac7: async (year: number): Promise<Dac7Response> => {
    const { data } = await api.get(`/admin/accounting/dac7?year=${year}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hosts = (data.hosts || []).map((h: any) => ({
      id: h.userId,
      name: h.name,
      email: h.email,
      nif: h.taxId,
      iban: h.bankAccount,
      totalIncome: h.totalIncome,
      operationsCount: h.operationCount,
      commissionsPaid: h.totalFeesPaid,
    }));
    return {
      hosts,
      summary: {
        totalHosts: data.summary?.totalHosts || 0,
        incompleteData: data.summary?.hostsWithIncompleteData || 0,
        totalReportableIncome: data.summary?.totalReportableIncome || 0,
      },
    };
  },

  getModelo347: async (year: number): Promise<Modelo347Response> => {
    const { data } = await api.get(`/admin/accounting/modelo347?year=${year}`);
    // Backend returns array directly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries = (Array.isArray(data) ? data : data.entries || []).map((e: any) => ({
      userId: e.userId,
      userName: e.name,
      nif: e.taxId,
      totalAnnual: e.totalAmount,
      q1: e.q1,
      q2: e.q2,
      q3: e.q3,
      q4: e.q4,
    }));
    return { entries };
  },

  getVatSummary: async (year: number, quarter: number): Promise<VatSummaryResponse> => {
    const { data } = await api.get(`/admin/accounting/vat-summary?year=${year}&quarter=${quarter}`);
    const typeLabels: Record<string, string> = {
      platform_fee: 'Comisiones plataforma',
      topup: 'Recargas monedero',
      experience_payment: 'Pagos experiencias',
      payment: 'Pagos (escrow)',
      refund: 'Reembolsos',
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapRow = (r: any): VatRow => ({
      concept: typeLabels[r.type] || r.type,
      operationsCount: r.count,
      grossAmount: r.grossAmount,
      taxableBase: r.netAmount,
      vatAmount: r.vatAmount,
    });
    return {
      rows: (data.lines || []).map(mapRow),
      totals: data.totals ? mapRow(data.totals) : { concept: 'Total', operationsCount: 0, grossAmount: 0, taxableBase: 0, vatAmount: 0 },
    };
  },
};

// ============================================
// SHARED UI COMPONENTS
// ============================================

function LoadingSpinner({ text = 'Cargando...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="spinner spinner-lg" />
      <p className="text-sm text-gray-400 mt-3">{text}</p>
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-red-500 flex-shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        <span className="text-red-700 text-sm">{message}</span>
      </div>
      <button
        onClick={onRetry}
        className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
      >
        Reintentar
      </button>
    </div>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function KpiCard({
  label,
  value,
  change,
  icon,
}: {
  label: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 md:p-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 md:w-10 md:h-10 bg-secondary/10 rounded-xl flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <div className="text-lg md:text-2xl font-bold text-gray-900 truncate">{value}</div>
            {change !== undefined && (
              <span
                className={`flex items-center gap-0.5 text-[10px] md:text-xs font-semibold px-1.5 md:px-2 py-0.5 rounded-full flex-shrink-0 ${
                  change >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className={`w-2.5 h-2.5 md:w-3 md:h-3 ${change < 0 ? 'rotate-180' : ''}`}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                </svg>
                {Math.abs(change).toFixed(1)}%
              </span>
            )}
          </div>
          <div className="text-[11px] md:text-xs text-gray-500 mt-0.5 truncate">{label}</div>
        </div>
      </div>
    </div>
  );
}

const BREAKDOWN_COLORS: Record<string, { color: string; label: string }> = {
  platform_fee: { color: '#8B5CF6', label: 'Comisiones' },
  topup: { color: '#3B82F6', label: 'Recargas' },
  experience_payment: { color: '#10B981', label: 'Pagos exp.' },
  refund: { color: '#F59E0B', label: 'Reembolsos' },
};

function RevenueBarChart({
  data,
  granularity,
}: {
  data: RevenueDataPoint[];
  granularity: string;
}) {
  if (!data || !data.length) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
        <h3 className="font-semibold text-gray-900 mb-4 text-sm md:text-base">Ingresos por periodo</h3>
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
          Sin datos para el periodo seleccionado
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.revenue), 1);
  const hasBreakdown = data.some((d) => d.breakdown && Object.keys(d.breakdown).length > 0);

  // Collect all types present in data for the legend
  const typesPresent = new Set<string>();
  if (hasBreakdown) {
    data.forEach((d) => {
      if (d.breakdown) Object.keys(d.breakdown).forEach((t) => typesPresent.add(t));
    });
  }

  const formatLabel = (period: string) => {
    if (granularity === 'daily') {
      const parts = period.split('-');
      return `${parts[2]}/${parts[1]}`;
    }
    if (granularity === 'weekly') {
      return `S${period.split('-W')[1] || period.slice(-2)}`;
    }
    const parts = period.split('-');
    return parts[1] || period;
  };

  // Ordered types for stacking (bottom to top)
  const stackOrder = ['platform_fee', 'topup', 'experience_payment', 'refund'];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 text-sm md:text-base">Ingresos por periodo</h3>
        {hasBreakdown && (
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {stackOrder.filter((t) => typesPresent.has(t)).map((type) => {
              const info = BREAKDOWN_COLORS[type];
              return (
                <div key={type} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: info?.color || '#9CA3AF' }} />
                  <span className="text-[10px] text-gray-500">{info?.label || type}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex items-end gap-0.5 md:gap-1 h-40">
        {data.map((item, index) => {
          const totalHeight = (item.revenue / maxValue) * 100;
          const segments = hasBreakdown && item.breakdown
            ? stackOrder
                .filter((t) => (item.breakdown?.[t] || 0) > 0)
                .map((type) => ({
                  type,
                  value: item.breakdown![type],
                  height: item.revenue > 0 ? ((item.breakdown![type] / item.revenue) * totalHeight) : 0,
                  color: BREAKDOWN_COLORS[type]?.color || '#9CA3AF',
                }))
            : [{ type: 'total', value: item.revenue, height: totalHeight, color: '#8B5CF6' }];

          return (
            <div key={index} className="flex-1 flex flex-col items-center min-w-0">
              <div
                className="w-full flex flex-col-reverse rounded-t overflow-hidden transition-all duration-300 hover:opacity-80"
                style={{ height: `${totalHeight}%`, minHeight: item.revenue > 0 ? '4px' : '0', minWidth: '6px' }}
                title={`${item.period}: ${formatEur(item.revenue)}`}
              >
                {segments.map((seg, si) => (
                  <div
                    key={si}
                    style={{
                      backgroundColor: seg.color,
                      flex: `${seg.height} 0 0%`,
                      minHeight: seg.value > 0 ? '2px' : '0',
                    }}
                  />
                ))}
              </div>
              <span className="text-[8px] md:text-[9px] text-gray-400 mt-1 truncate w-full text-center">
                {formatLabel(item.period)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// TAB: RESUMEN
// ============================================

function ResumenTab() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [granularity, setGranularity] = useState('monthly');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [walletStats, setWalletStats] = useState<WalletStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [data, walletData] = await Promise.all([
        accountingApi.getDashboard(startDate || undefined, endDate || undefined, granularity),
        api.get('/admin/reports/financial/wallets').then((r) => r.data).catch(() => null),
      ]);
      setDashboardData(data);
      setWalletStats(walletData);
    } catch {
      setError('Error al cargar el resumen contable');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, granularity]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return <LoadingSpinner text="Cargando resumen..." />;
  }

  if (error) {
    return <ErrorCard message={error} onRetry={fetchDashboard} />;
  }

  if (!dashboardData) return null;

  const kpis = dashboardData.kpis || DEFAULT_KPIS;
  const revenueChart = dashboardData.revenueChart || [];

  return (
    <div className="space-y-4">
      {/* Date range picker */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 md:p-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Desde</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 min-h-[44px]"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Hasta</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 min-h-[44px]"
            />
          </div>
          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            className="text-xs text-secondary font-medium px-3 py-2.5 min-h-[44px] hover:bg-secondary/5 rounded-lg transition-colors"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Ingresos de la plataforma */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <h3 className="text-sm font-semibold text-gray-900">Ingresos de la plataforma</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <KpiCard
            label="Comisiones"
            value={formatEur(kpis.platformFees)}
            change={kpis.platformFeesChange}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5 text-green-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            }
          />
          <KpiCard
            label="Pagos experiencias"
            value={formatEur(kpis.experiencePayments)}
            change={kpis.experiencePaymentsChange}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5 text-green-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
              </svg>
            }
          />
          <KpiCard
            label="Reembolsos"
            value={formatEur(kpis.refunds)}
            change={kpis.refundsChange}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5 text-red-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
              </svg>
            }
          />
          <KpiCard
            label="Beneficio neto"
            value={formatEur(kpis.platformFees - kpis.refunds)}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-4 h-4 md:w-5 md:h-5 ${kpis.platformFees - kpis.refunds >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Monederos de usuarios (fondos en custodia) */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
          <h3 className="text-sm font-semibold text-gray-900">Monederos de usuarios</h3>
          <span className="text-[10px] text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">Fondos en custodia</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <KpiCard
            label="Recargas"
            value={formatEur(kpis.walletTopups)}
            change={kpis.walletTopupsChange}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5 text-blue-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
              </svg>
            }
          />
          <KpiCard
            label="Saldo total monederos"
            value={formatEur(kpis.totalWalletBalance)}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5 text-blue-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
              </svg>
            }
          />
          <KpiCard
            label="Operaciones"
            value={kpis.operationsCount.toLocaleString('es-ES')}
            change={kpis.operationsCountChange}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5 text-blue-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
            }
          />
        </div>
        {walletStats && (
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 md:p-4 text-center">
              <div className="text-lg md:text-xl font-bold text-gray-900">{walletStats.walletsWithBalance}<span className="text-sm font-normal text-gray-400">/{walletStats.totalWallets}</span></div>
              <div className="text-[10px] md:text-xs text-gray-500 mt-0.5">Monederos activos</div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 md:p-4 text-center">
              <div className="text-lg md:text-xl font-bold text-gray-900">{formatEur(walletStats.avgBalance)}</div>
              <div className="text-[10px] md:text-xs text-gray-500 mt-0.5">Saldo medio</div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 md:p-4 text-center">
              <div className="text-lg md:text-xl font-bold text-gray-900">{formatEur(walletStats.maxBalance)}</div>
              <div className="text-[10px] md:text-xs text-gray-500 mt-0.5">Saldo maximo</div>
            </div>
          </div>
        )}
      </div>

      {/* Chart + period selector */}
      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {(['daily', 'weekly', 'monthly'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-colors whitespace-nowrap min-h-[36px] ${
                granularity === g
                  ? 'bg-secondary text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {g === 'daily' ? 'Diario' : g === 'weekly' ? 'Semanal' : 'Mensual'}
            </button>
          ))}
        </div>
        <RevenueBarChart data={revenueChart} granularity={granularity} />
      </div>
    </div>
  );
}

// ============================================
// TAB: TRANSACCIONES
// ============================================

// ── Helpers de descripción enriquecida ─────────────────────────────────

const POLICY_NAMES: Record<string, string> = {
  FLEXIBLE: 'Flexible', MODERATE: 'Moderada', STRICT: 'Estricta', NON_REFUNDABLE: 'Sin reembolso',
};

const DISPUTE_STATUS_LABELS: Record<string, string> = {
  RESOLVED_REFUND: 'reembolso total', RESOLVED_PARTIAL_REFUND: 'reembolso parcial',
  RESOLVED_NO_REFUND: 'sin reembolso', CLOSED: 'cerrada',
};

const DISPUTE_REASON_LABELS: Record<string, string> = {
  NO_SHOW: 'No presentado', EXPERIENCE_MISMATCH: 'No coincide con lo ofrecido',
  SAFETY_CONCERN: 'Problema de seguridad', PAYMENT_ISSUE: 'Problema de pago',
  COMMUNICATION: 'Comunicacion', OTHER: 'Otro',
};

function getEnrichedDescription(tx: Transaction): string {
  if (!tx.match?.experience) return tx.description;
  const title = tx.match.experience.title;
  const cancel = tx.match.cancellation;
  const dispute = tx.match.disputes?.[0];

  if (tx.type === 'refund' && cancel) {
    return `Reembolso por cancelacion (${POLICY_NAMES[cancel.policy] || cancel.policy}, ${cancel.refundPercentage}%) · ${title}`;
  }
  if (tx.type === 'refund' && dispute) {
    return `Reembolso por disputa (${DISPUTE_STATUS_LABELS[dispute.status] || 'resolucion'}) · ${title}`;
  }
  if ((tx.type === 'payment' || tx.type === 'experience_payment') && tx.match.experience.city) {
    return `${tx.description || title} · ${tx.match.experience.city}`;
  }
  return tx.description || title;
}

// ── Escrow Timeline Component ──────────────────────────────────────────

function EscrowTimeline({ events }: { events: TimelineEvent[] }) {
  const getNode = (event: TimelineEvent) => {
    const txData = event.data as Record<string, unknown>;
    const status = txData?.status as string | undefined;
    switch (event.type) {
      case 'transaction': {
        switch (status) {
          case 'pending': return { bg: 'bg-yellow-400', label: 'Pago iniciado' };
          case 'held': return { bg: 'bg-blue-500', label: 'Fondos retenidos (escrow)' };
          case 'capturing': return { bg: 'bg-cyan-500', label: 'Captura en curso' };
          case 'released': return { bg: 'bg-green-500', label: 'Fondos liberados al anfitrion' };
          case 'refunded': return { bg: 'bg-amber-500', label: 'Fondos reembolsados' };
          case 'completed': return { bg: 'bg-green-500', label: 'Completado' };
          case 'failed': return { bg: 'bg-red-500', label: 'Fallido' };
          default: return { bg: 'bg-gray-400', label: status || 'Transaccion' };
        }
      }
      case 'cancellation': return { bg: 'bg-red-400', label: 'Cancelacion registrada' };
      case 'dispute_opened': return { bg: 'bg-orange-500', label: 'Disputa abierta' };
      case 'dispute_resolved': return { bg: 'bg-purple-500', label: 'Disputa resuelta' };
      default: return { bg: 'bg-gray-400', label: event.type };
    }
  };

  const getTxDetail = (event: TimelineEvent) => {
    const d = event.data as Record<string, unknown>;
    if (event.type === 'transaction') {
      const type = typeBadge[d.type as string];
      const amount = d.amount as number;
      return (
        <span className="text-[11px] text-gray-500">
          {type?.label || String(d.type)} · <span className={amount >= 0 ? 'text-green-600' : 'text-red-600'}>{formatEur(amount)}</span>
          {d.description ? ` · ${String(d.description)}` : ''}
        </span>
      );
    }
    if (event.type === 'cancellation') {
      const policy = POLICY_NAMES[(d.policy as string)] || String(d.policy);
      return <span className="text-[11px] text-gray-500">{policy} · Reembolso {String(d.refundPercentage)}% ({formatEur(d.refundAmount as number)}) · Penalizacion {formatEur(d.penaltyAmount as number)}</span>;
    }
    if (event.type === 'dispute_opened') {
      return <span className="text-[11px] text-gray-500">{DISPUTE_REASON_LABELS[d.reason as string] || String(d.reason)}</span>;
    }
    if (event.type === 'dispute_resolved') {
      return <span className="text-[11px] text-gray-500">{DISPUTE_STATUS_LABELS[d.status as string] || 'Resuelta'}{d.refundAmount ? ` · ${formatEur(d.refundAmount as number)}` : ''}</span>;
    }
    return null;
  };

  return (
    <div className="relative pl-6 py-2">
      <div className="absolute left-[9px] top-4 bottom-4 w-0.5 bg-gray-200" />
      {events.map((event, i) => {
        const node = getNode(event);
        return (
          <div key={i} className="relative flex items-start gap-3 pb-3 last:pb-0">
            <div className={`absolute left-[-15px] top-0.5 w-3 h-3 rounded-full ${node.bg} ring-2 ring-white flex-shrink-0`} />
            <div className="min-w-0">
              <div className="text-xs font-medium text-gray-900">{node.label}</div>
              <div className="text-[11px] text-gray-400">{formatDate(event.date)}</div>
              {getTxDetail(event)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Transaction Detail Panel ───────────────────────────────────────────

function TransactionDetailPanel({ tx, timeline, timelineLoading }: {
  tx: Transaction;
  timeline: { match: MatchContext | null; events: TimelineEvent[] } | null;
  timelineLoading: boolean;
}) {
  const m = tx.match;
  const cancel = m?.cancellation;
  const dispute = m?.disputes?.[0];

  return (
    <div className="bg-gray-50 border-t border-gray-100 p-4 space-y-4 animate-in">
      {/* Metadata */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {tx.stripeId && (
          <div>
            <span className="text-gray-400 block">Stripe ID</span>
            <span className="font-mono text-gray-700 break-all">{tx.stripeId}</span>
          </div>
        )}
        {tx.matchId && (
          <div>
            <span className="text-gray-400 block">ID Reserva</span>
            <span className="font-mono text-gray-700 break-all">{tx.matchId.slice(0, 8)}...</span>
          </div>
        )}
        <div>
          <span className="text-gray-400 block">Fecha completa</span>
          <span className="text-gray-700">{formatDate(tx.date)}</span>
        </div>
        {m?.paymentStatus && (
          <div>
            <span className="text-gray-400 block">Estado pago</span>
            <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${(statusBadge[m.paymentStatus] || statusBadge.pending).bg} ${(statusBadge[m.paymentStatus] || statusBadge.pending).text}`}>
              {(statusBadge[m.paymentStatus] || { label: m.paymentStatus }).label}
            </span>
          </div>
        )}
      </div>

      {/* Match context */}
      {m?.experience && (
        <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contexto</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-gray-400">Experiencia</span>
              <p className="font-medium text-gray-900">{m.experience.title}</p>
              <p className="text-gray-500">{m.experience.city} · Politica: {POLICY_NAMES[m.experience.cancellationPolicy] || m.experience.cancellationPolicy}</p>
            </div>
            {m.host && (
              <div>
                <span className="text-gray-400">Anfitrion</span>
                <p className="font-medium text-gray-900">{m.host.name}</p>
                <p className="text-gray-500">{m.host.email}</p>
              </div>
            )}
            {m.requester && (
              <div>
                <span className="text-gray-400">Viajero</span>
                <p className="font-medium text-gray-900">{m.requester.name}</p>
                <p className="text-gray-500">{m.requester.email}</p>
              </div>
            )}
          </div>
          {(m.startDate || m.totalPrice) && (
            <div className="flex gap-4 text-xs text-gray-500 pt-1 border-t border-gray-50">
              {m.startDate && <span>Fecha: {new Date(m.startDate).toLocaleDateString('es-ES')}</span>}
              {m.totalPrice && <span>Precio: {formatEur(m.totalPrice)}</span>}
              {m.participants > 1 && <span>{m.participants} participantes</span>}
            </div>
          )}
        </div>
      )}

      {/* Cancelación */}
      {cancel && (
        <div className="bg-red-50 rounded-xl border border-red-100 p-3 space-y-1">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Cancelacion</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div><span className="text-red-400">Politica</span><p className="font-medium text-red-700">{POLICY_NAMES[cancel.policy] || cancel.policy}</p></div>
            <div><span className="text-red-400">Reembolso</span><p className="font-medium text-red-700">{cancel.refundPercentage}% ({formatEur(cancel.refundAmount)})</p></div>
            <div><span className="text-red-400">Penalizacion</span><p className="font-medium text-red-700">{formatEur(cancel.penaltyAmount)}</p></div>
            <div><span className="text-red-400">Fecha</span><p className="font-medium text-red-700">{formatDate(cancel.createdAt)}</p></div>
          </div>
          {cancel.reason && <p className="text-xs text-red-600 mt-1">Motivo: {cancel.reason}</p>}
        </div>
      )}

      {/* Disputa */}
      {dispute && (
        <div className="bg-orange-50 rounded-xl border border-orange-100 p-3 space-y-1">
          <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Disputa</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div><span className="text-orange-400">Motivo</span><p className="font-medium text-orange-700">{DISPUTE_REASON_LABELS[dispute.reason] || dispute.reason}</p></div>
            <div><span className="text-orange-400">Estado</span><p className="font-medium text-orange-700">{DISPUTE_STATUS_LABELS[dispute.status] || dispute.status}</p></div>
            {dispute.refundAmount != null && <div><span className="text-orange-400">Reembolso</span><p className="font-medium text-orange-700">{formatEur(dispute.refundAmount)}{dispute.refundPercentage != null ? ` (${dispute.refundPercentage}%)` : ''}</p></div>}
            {dispute.resolvedAt && <div><span className="text-orange-400">Resuelto</span><p className="font-medium text-orange-700">{formatDate(dispute.resolvedAt)}</p></div>}
          </div>
          {dispute.resolution && <p className="text-xs text-orange-600 mt-1">Resolucion: {dispute.resolution}</p>}
        </div>
      )}

      {/* Escrow Timeline */}
      {tx.matchId && (
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Timeline del flujo</p>
          {timelineLoading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : timeline?.events?.length ? (
            <EscrowTimeline events={timeline.events} />
          ) : (
            <p className="text-xs text-gray-400 py-2">Sin eventos registrados</p>
          )}
        </div>
      )}
    </div>
  );
}

function TransaccionesTab() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSearch, setFilterSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [timelineData, setTimelineData] = useState<{ match: MatchContext | null; events: TimelineEvent[] } | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const filters = {
    startDate: filterStartDate || undefined,
    endDate: filterEndDate || undefined,
    type: filterType,
    status: filterStatus,
    search: filterSearch || undefined,
  };

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await accountingApi.getTransactions(page, 20, filters);
      setTransactions(result.transactions);
      setPagination(result.pagination);
    } catch {
      setError('Error al cargar transacciones');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterStartDate, filterEndDate, filterType, filterStatus, filterSearch]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleExport = () => {
    const exportUrl = accountingApi.exportTransactions(filters);
    const baseUrl = api.defaults.baseURL || '';
    window.open(`${baseUrl}${exportUrl}`, '_blank');
  };

  const handleExpandTransaction = async (tx: Transaction) => {
    if (expandedTxId === tx.id) {
      setExpandedTxId(null);
      setTimelineData(null);
      return;
    }
    setExpandedTxId(tx.id);
    if (tx.matchId) {
      setTimelineLoading(true);
      try {
        const data = await accountingApi.getMatchTimeline(tx.matchId);
        setTimelineData(data);
      } catch {
        setTimelineData(null);
      } finally {
        setTimelineLoading(false);
      }
    } else {
      setTimelineData(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 md:p-4 space-y-3">
        {/* Always visible: search + type on one row */}
        <div className="flex gap-2">
          <form onSubmit={handleSearch} className="flex-1">
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Buscar usuario o email..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 min-h-[44px]"
            />
          </form>
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm min-h-[44px] max-w-[140px]"
          >
            <option value="all">Todos</option>
            <option value="topup">Recarga</option>
            <option value="platform_fee">Comision</option>
            <option value="refund">Reembolso</option>
            <option value="experience_payment">Pago exp.</option>
          </select>
        </div>

        {/* Mobile toggle for additional filters */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 text-xs text-secondary font-medium md:hidden min-h-[36px]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
          </svg>
          {showFilters ? 'Ocultar filtros' : 'Mas filtros'}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {/* Collapsible filters on mobile, always visible on md+ */}
        <div className={`${showFilters ? 'block' : 'hidden'} md:block space-y-3`}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Desde</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => { setFilterStartDate(e.target.value); setPage(1); }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hasta</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => { setFilterEndDate(e.target.value); setPage(1); }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Estado</label>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm min-h-[44px]"
              >
                <option value="all">Todos</option>
                <option value="completed">Completado</option>
                <option value="held">Retenido</option>
                <option value="released">Liberado</option>
                <option value="pending">Pendiente</option>
                <option value="cancelled">Cancelado</option>
                <option value="refunded">Reembolsado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer: count + export */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-gray-400">
            {pagination.total} transacciones
          </span>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-secondary text-white rounded-lg text-xs font-medium hover:bg-secondary/90 transition-colors min-h-[36px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <ErrorCard message={error} onRetry={fetchTransactions} />}

      {/* Loading */}
      {loading && <LoadingSpinner text="Cargando transacciones..." />}

      {/* MOBILE: Card-based transaction list */}
      {!loading && transactions.length > 0 && (
        <div className="md:hidden space-y-3">
          {transactions.map((tx) => {
            const tBadge = typeBadge[tx.type] || { label: tx.type, bg: 'bg-gray-100', text: 'text-gray-600' };
            const sBadge = statusBadge[tx.status] || { label: tx.status, bg: 'bg-gray-100', text: 'text-gray-500' };
            const isNegative = tx.type !== 'refund' && tx.type !== 'topup' && tx.amount < 0;
            const borderColor = typeBorderColor[tx.type] || 'border-l-gray-300';
            const isExpanded = expandedTxId === tx.id;
            return (
              <div key={tx.id} className={`bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 ${borderColor} overflow-hidden`}>
                <button
                  onClick={() => handleExpandTransaction(tx)}
                  className="w-full text-left p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${tBadge.bg} ${tBadge.text}`}>
                      {tBadge.label}
                    </span>
                    <span className={`text-base font-bold ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
                      {isNegative ? '-' : '+'}{formatEur(Math.abs(tx.amount))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900">{tx.userName}</div>
                      <div className="text-xs text-gray-500">{getEnrichedDescription(tx)}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{formatDate(tx.date)}</div>
                    </div>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${sBadge.bg} ${sBadge.text}`}>
                        {sBadge.label}
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </button>
                {isExpanded && (
                  <TransactionDetailPanel tx={tx} timeline={timelineData} timelineLoading={timelineLoading} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* DESKTOP: Table */}
      {!loading && transactions.length > 0 && (
        <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Usuario</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Tipo</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Importe</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Descripcion</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const tBadge = typeBadge[tx.type] || { label: tx.type, bg: 'bg-gray-100', text: 'text-gray-600' };
                  const sBadge = statusBadge[tx.status] || { label: tx.status, bg: 'bg-gray-100', text: 'text-gray-500' };
                  const isNegative = tx.type !== 'refund' && tx.type !== 'topup' && tx.amount < 0;
                  const isExpanded = expandedTxId === tx.id;
                  return (
                    <React.Fragment key={tx.id}>
                      <tr
                        onClick={() => handleExpandTransaction(tx)}
                        className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer ${isExpanded ? 'bg-gray-50' : ''}`}
                      >
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                          {formatDate(tx.date)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 text-sm">{tx.userName}</div>
                          <div className="text-xs text-gray-400">{tx.userEmail}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${tBadge.bg} ${tBadge.text}`}>
                            {tBadge.label}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
                          {isNegative ? '-' : '+'}{formatEur(Math.abs(tx.amount))}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${sBadge.bg} ${sBadge.text}`}>
                            {sBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          <div className="flex items-center gap-1">
                            <span>{getEnrichedDescription(tx)}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 text-gray-300 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                              <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="p-0">
                            <TransactionDetailPanel tx={tx} timeline={timelineData} timelineLoading={timelineLoading} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && transactions.length === 0 && !error && (
        <EmptyState
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
            </svg>
          }
          message="No hay transacciones con estos filtros"
        />
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors min-h-[44px]"
          >
            Anterior
          </button>
          {/* Page numbers: hidden on mobile, visible on md+ */}
          <div className="hidden md:flex gap-1">
            {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => {
              let pageNum: number;
              if (pagination.pages <= 7) {
                pageNum = i + 1;
              } else if (page <= 4) {
                pageNum = i + 1;
              } else if (page >= pagination.pages - 3) {
                pageNum = pagination.pages - 6 + i;
              } else {
                pageNum = page - 3 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                    page === pageNum
                      ? 'bg-secondary text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          {/* Mobile page indicator */}
          <span className="md:hidden text-xs text-gray-500">
            {page} / {pagination.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
            disabled={page === pagination.pages}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors min-h-[44px]"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// TAB: INFORME DAC7
// ============================================

function Dac7Tab() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<Dac7Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDac7 = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await accountingApi.getDac7(year);
      setData(result);
    } catch {
      setError('Error al cargar el informe DAC7');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchDac7();
  }, [fetchDac7]);

  const handleExport = () => {
    const baseUrl = api.defaults.baseURL || '';
    window.open(`${baseUrl}/admin/accounting/export/dac7?year=${year}`, '_blank');
  };

  if (loading) {
    return <LoadingSpinner text="Cargando informe DAC7..." />;
  }

  if (error) {
    return <ErrorCard message={error} onRetry={fetchDac7} />;
  }

  if (!data) return null;

  const hosts = data.hosts || [];
  const summary = data.summary || { totalHosts: 0, incompleteData: 0, totalReportableIncome: 0 };
  const incompleteCount = summary.incompleteData;

  return (
    <div className="space-y-4">
      {/* Year selector + export */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Ejercicio fiscal</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-full sm:w-auto px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium min-h-[44px]"
          >
            {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleExport}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-secondary text-white rounded-lg text-sm font-medium hover:bg-secondary/90 transition-colors min-h-[44px]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Exportar DAC7 (CSV)
        </button>
      </div>

      {/* Warning banner */}
      {incompleteCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 md:p-4 flex items-start gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800">
              {incompleteCount} {incompleteCount === 1 ? 'anfitrion tiene' : 'anfitriones tienen'} datos fiscales incompletos
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Es necesario que completen su NIF e IBAN para cumplir con la normativa DAC7
            </p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 md:p-5">
          <div className="text-[11px] md:text-xs text-gray-500 mb-1">Total anfitriones</div>
          <div className="text-xl md:text-2xl font-bold text-gray-900">{summary.totalHosts}</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 md:p-5">
          <div className="text-[11px] md:text-xs text-gray-500 mb-1">Datos incompletos</div>
          <div className={`text-xl md:text-2xl font-bold ${incompleteCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
            {incompleteCount}
          </div>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-3 md:p-5">
          <div className="text-[11px] md:text-xs text-gray-500 mb-1">Ingresos reportables totales</div>
          <div className="text-xl md:text-2xl font-bold text-gray-900">{formatEur(summary.totalReportableIncome)}</div>
        </div>
      </div>

      {/* MOBILE: Card-based host list */}
      {hosts.length > 0 ? (
        <>
          <div className="md:hidden space-y-3">
            {hosts.map((host) => (
              <div key={host.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
                {/* Name + email */}
                <div className="mb-2">
                  <div className="font-medium text-gray-900 text-sm">{host.name}</div>
                  <div className="text-xs text-gray-400">{host.email}</div>
                </div>
                {/* NIF + IBAN */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">NIF:</span>
                    {host.nif ? (
                      <span className="text-gray-700 font-mono">{host.nif}</span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-amber-600">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                        Sin NIF
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">IBAN:</span>
                    {host.iban ? (
                      <span className="text-gray-700 font-mono">{host.iban}</span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-amber-600">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                        Sin IBAN
                      </span>
                    )}
                  </div>
                </div>
                {/* 3-col mini-grid: Income, Ops, Commissions */}
                <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-lg p-2 text-center">
                  <div>
                    <div className="text-[10px] text-gray-500">Ingresos</div>
                    <div className="text-xs font-semibold text-gray-900">{formatEur(host.totalIncome)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500">Ops.</div>
                    <div className="text-xs font-semibold text-gray-900">{host.operationsCount}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500">Comisiones</div>
                    <div className="text-xs font-semibold text-gray-900">{formatEur(host.commissionsPaid)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP: Table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Anfitrion</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">NIF</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">IBAN</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Ingresos</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Ops.</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Comisiones</th>
                  </tr>
                </thead>
                <tbody>
                  {hosts.map((host) => (
                    <tr key={host.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{host.name}</div>
                        <div className="text-xs text-gray-400">{host.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        {host.nif ? (
                          <span className="text-gray-700 font-mono text-xs">{host.nif}</span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-600 text-xs">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                            </svg>
                            Sin NIF
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {host.iban ? (
                          <span className="text-gray-700 font-mono text-xs">{host.iban}</span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-600 text-xs">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                            </svg>
                            Sin IBAN
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatEur(host.totalIncome)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{host.operationsCount}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatEur(host.commissionsPaid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          }
          message={`No hay datos DAC7 para el ejercicio ${year}`}
        />
      )}
    </div>
  );
}

// ============================================
// TAB: OBLIGACIONES FISCALES
// ============================================

function ObligacionesFiscalesTab() {
  const currentYear = new Date().getFullYear();
  const currentQ = Math.ceil((new Date().getMonth() + 1) / 3);
  const [year, setYear] = useState(currentYear);
  const [quarter, setQuarter] = useState(currentQ);
  const [subTab, setSubTab] = useState<'iva' | '347'>('iva');

  const [modelo347, setModelo347] = useState<Modelo347Response | null>(null);
  const [vatSummary, setVatSummary] = useState<VatSummaryResponse | null>(null);
  const [loading347, setLoading347] = useState(true);
  const [loadingVat, setLoadingVat] = useState(true);
  const [error347, setError347] = useState('');
  const [errorVat, setErrorVat] = useState('');

  const fetch347 = useCallback(async () => {
    setLoading347(true);
    setError347('');
    try {
      const result = await accountingApi.getModelo347(year);
      setModelo347(result);
    } catch {
      setError347('Error al cargar Modelo 347');
    } finally {
      setLoading347(false);
    }
  }, [year]);

  const fetchVat = useCallback(async () => {
    setLoadingVat(true);
    setErrorVat('');
    try {
      const result = await accountingApi.getVatSummary(year, quarter);
      setVatSummary(result);
    } catch {
      setErrorVat('Error al cargar resumen IVA');
    } finally {
      setLoadingVat(false);
    }
  }, [year, quarter]);

  useEffect(() => {
    fetch347();
  }, [fetch347]);

  useEffect(() => {
    fetchVat();
  }, [fetchVat]);

  const handleExport347 = () => {
    const baseUrl = api.defaults.baseURL || '';
    window.open(`${baseUrl}/admin/accounting/export/modelo347?year=${year}`, '_blank');
  };

  const quarterLabel = { 1: 'Ene - Mar', 2: 'Abr - Jun', 3: 'Jul - Sep', 4: 'Oct - Dic' }[quarter] || '';

  return (
    <div className="space-y-4">
      {/* Sub-tab selector: IVA / 347 */}
      <div className="flex gap-2">
        <button
          onClick={() => setSubTab('iva')}
          className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            subTab === 'iva'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          IVA trimestral
        </button>
        <button
          onClick={() => setSubTab('347')}
          className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            subTab === '347'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Modelo 347
        </button>
      </div>

      {/* ── IVA TRIMESTRAL ────────────────────────────────────────── */}
      {subTab === 'iva' && (
        <div className="space-y-4">
          {/* Filtros: año + trimestre */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 md:p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 sm:flex-none">
                <label className="block text-xs text-gray-500 mb-1">Ejercicio</label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium min-h-[44px]"
                >
                  {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 sm:flex-none">
                <label className="block text-xs text-gray-500 mb-1">Trimestre</label>
                <select
                  value={quarter}
                  onChange={(e) => setQuarter(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium min-h-[44px]"
                >
                  <option value={1}>Q1 (Ene - Mar)</option>
                  <option value={2}>Q2 (Abr - Jun)</option>
                  <option value={3}>Q3 (Jul - Sep)</option>
                  <option value={4}>Q4 (Oct - Dic)</option>
                </select>
              </div>
              <button
                onClick={() => {
                  const baseUrl = api.defaults.baseURL || '';
                  window.open(`${baseUrl}/admin/accounting/export/vat-summary?year=${year}&quarter=${quarter}`, '_blank');
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-secondary text-white rounded-lg text-xs font-medium hover:bg-secondary/90 transition-colors min-h-[44px]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Exportar CSV
              </button>
            </div>
          </div>

          {/* Header */}
          <div>
            <h3 className="font-semibold text-gray-900 text-base">Resumen IVA &middot; Q{quarter} {year}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Desglose de operaciones e IVA al 21% &middot; {quarterLabel} {year}
            </p>
          </div>

          {errorVat && <ErrorCard message={errorVat} onRetry={fetchVat} />}

          {loadingVat ? (
            <LoadingSpinner text="Cargando resumen IVA..." />
          ) : vatSummary && (vatSummary.rows || []).length > 0 ? (
            <>
              {/* MOBILE: Cards */}
              <div className="md:hidden space-y-3">
                {(vatSummary.rows || []).map((row, index) => (
                  <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 text-sm">{row.concept}</span>
                      <span className="text-xs text-gray-400">{row.operationsCount} ops.</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <div className="text-[10px] text-gray-400">Bruto</div>
                        <div className="text-sm font-semibold text-gray-900">{formatEur(row.grossAmount)}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <div className="text-[10px] text-gray-400">Base</div>
                        <div className="text-sm font-semibold text-gray-900">{formatEur(row.taxableBase)}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <div className="text-[10px] text-gray-400">IVA</div>
                        <div className={`text-sm font-semibold ${row.vatAmount > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                          {formatEur(row.vatAmount)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Totals card */}
                <div className="bg-blue-50 rounded-xl border-2 border-blue-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-900 text-sm">TOTAL</span>
                    <span className="text-xs text-gray-500">{vatSummary.totals?.operationsCount || 0} ops.</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white rounded-lg p-2 text-center">
                      <div className="text-[10px] text-gray-400">Bruto</div>
                      <div className="text-sm font-bold text-gray-900">{formatEur(vatSummary.totals?.grossAmount || 0)}</div>
                    </div>
                    <div className="bg-white rounded-lg p-2 text-center">
                      <div className="text-[10px] text-gray-400">Base</div>
                      <div className="text-sm font-bold text-gray-900">{formatEur(vatSummary.totals?.taxableBase || 0)}</div>
                    </div>
                    <div className="bg-white rounded-lg p-2 text-center">
                      <div className="text-[10px] text-gray-400">IVA</div>
                      <div className="text-sm font-bold text-blue-600">{formatEur(vatSummary.totals?.vatAmount || 0)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* DESKTOP: Table */}
              <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Concepto</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">N.o Ops.</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Importe bruto</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Base imponible</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">IVA (21%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(vatSummary.rows || []).map((row, index) => (
                      <tr key={index} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{row.concept}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{row.operationsCount}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{formatEur(row.grossAmount)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{formatEur(row.taxableBase)}</td>
                        <td className={`px-4 py-3 text-right ${row.vatAmount > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                          {formatEur(row.vatAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-200">
                      <td className="px-4 py-3 font-bold text-gray-900">TOTAL</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{vatSummary.totals?.operationsCount || 0}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{formatEur(vatSummary.totals?.grossAmount || 0)}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{formatEur(vatSummary.totals?.taxableBase || 0)}</td>
                      <td className="px-4 py-3 text-right font-bold text-blue-600">{formatEur(vatSummary.totals?.vatAmount || 0)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-300 mx-auto mb-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <p className="text-gray-500 text-sm">Sin operaciones en Q{quarter} {year}</p>
            </div>
          )}
        </div>
      )}

      {/* ── MODELO 347 ────────────────────────────────────────────── */}
      {subTab === '347' && (
        <div className="space-y-4">
          {/* Filtro: solo año (347 es anual) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 md:p-4">
            <div className="flex items-end gap-3">
              <div className="flex-1 sm:flex-none">
                <label className="block text-xs text-gray-500 mb-1">Ejercicio</label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium min-h-[44px]"
                >
                  {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleExport347}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-secondary text-white rounded-lg text-xs font-medium hover:bg-secondary/90 transition-colors min-h-[44px]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Exportar CSV
              </button>
            </div>
          </div>

          {/* Header */}
          <div>
            <h3 className="font-semibold text-gray-900 text-base">Modelo 347 &middot; {year}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Declaracion anual de operaciones con terceros que superen 3.005,06 EUR
            </p>
          </div>

          {error347 && <ErrorCard message={error347} onRetry={fetch347} />}

          {loading347 ? (
            <LoadingSpinner text="Cargando Modelo 347..." />
          ) : modelo347 && modelo347.entries && modelo347.entries.length > 0 ? (
            <>
              {/* MOBILE: Card layout */}
              <div className="md:hidden space-y-3">
                {modelo347.entries.map((entry) => (
                  <Modelo347Card key={entry.userId} entry={entry} />
                ))}
              </div>

              {/* DESKTOP: Table */}
              <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Usuario</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">NIF</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-500">Total anual</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-500">Q1</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-500">Q2</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-500">Q3</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-500">Q4</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modelo347.entries.map((entry) => (
                        <tr key={entry.userId} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{entry.userName}</div>
                          </td>
                          <td className="px-4 py-3">
                            {entry.nif ? (
                              <span className="text-gray-700 font-mono text-xs">{entry.nif}</span>
                            ) : (
                              <span className="flex items-center gap-1 text-amber-600 text-xs">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                </svg>
                                Sin NIF
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatEur(entry.totalAnnual)}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{formatEur(entry.q1)}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{formatEur(entry.q2)}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{formatEur(entry.q3)}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{formatEur(entry.q4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-300 mx-auto mb-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <p className="text-gray-500 text-sm">No hay operaciones que superen 3.005,06 EUR en {year}</p>
              <p className="text-xs text-gray-400 mt-1">Umbral minimo para la declaracion anual</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Modelo 347 mobile card with collapsible quarterly detail
function Modelo347Card({ entry }: { entry: Modelo347Entry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between min-h-[44px]"
      >
        <div className="text-left min-w-0 flex-1">
          <div className="font-medium text-gray-900 text-sm truncate">{entry.userName}</div>
          <div className="flex items-center gap-2 mt-0.5">
            {entry.nif ? (
              <span className="text-gray-600 font-mono text-xs">{entry.nif}</span>
            ) : (
              <span className="flex items-center gap-0.5 text-amber-600 text-xs">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                Sin NIF
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="text-base font-bold text-gray-900">{formatEur(entry.totalAnnual)}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>
      {expanded && (
        <div className="mt-2 pt-2 border-t border-gray-100 grid grid-cols-4 gap-2">
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="text-[10px] text-gray-500">Q1</div>
            <div className="text-xs font-semibold text-gray-900">{formatEur(entry.q1)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="text-[10px] text-gray-500">Q2</div>
            <div className="text-xs font-semibold text-gray-900">{formatEur(entry.q2)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="text-[10px] text-gray-500">Q3</div>
            <div className="text-xs font-semibold text-gray-900">{formatEur(entry.q3)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="text-[10px] text-gray-500">Q4</div>
            <div className="text-xs font-semibold text-gray-900">{formatEur(entry.q4)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// TAB: CUENTA DE RESULTADOS (P&L)
// ============================================

interface PnlQuarter {
  quarter: number;
  label: string;
  platformFees: number;
  vatCollected: number;
  totalRefunds: number;
  grossRevenue: number;
  netProfit: number;
}

interface PnlData {
  year: number;
  summary: {
    totalPlatformFees: number;
    totalVatCollected: number;
    totalRefunds: number;
    grossRevenue: number;
    netProfit: number;
  };
  quarters: PnlQuarter[];
}

function CuentaResultadosTab() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<PnlData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPnl = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: result } = await api.get(`/admin/accounting/pnl?year=${year}`);
      setData(result);
    } catch {
      setError('Error al cargar la cuenta de resultados');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchPnl();
  }, [fetchPnl]);

  const handleExport = () => {
    const baseUrl = api.defaults.baseURL || '';
    window.open(`${baseUrl}/admin/accounting/export/pnl?year=${year}`, '_blank');
  };

  if (loading) return <LoadingSpinner text="Cargando cuenta de resultados..." />;
  if (error) return <ErrorCard message={error} onRetry={fetchPnl} />;
  if (!data) return null;

  const s = data.summary;
  const quarters = data.quarters || [];

  return (
    <div className="space-y-4">
      {/* Year selector + export */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Ejercicio fiscal</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-full sm:w-auto px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium min-h-[44px]"
          >
            {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleExport}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-secondary text-white rounded-lg text-sm font-medium hover:bg-secondary/90 transition-colors min-h-[44px]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Exportar CSV
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 md:p-5">
          <div className="text-[11px] md:text-xs text-gray-500 mb-1">Comisiones</div>
          <div className="text-xl md:text-2xl font-bold text-gray-900">{formatEur(s.totalPlatformFees)}</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 md:p-5">
          <div className="text-[11px] md:text-xs text-gray-500 mb-1">IVA recaudado</div>
          <div className="text-xl md:text-2xl font-bold text-blue-600">{formatEur(s.totalVatCollected)}</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 md:p-5">
          <div className="text-[11px] md:text-xs text-gray-500 mb-1">Reembolsos</div>
          <div className="text-xl md:text-2xl font-bold text-red-500">{formatEur(s.totalRefunds)}</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 md:p-5">
          <div className="text-[11px] md:text-xs text-gray-500 mb-1">Ingreso bruto</div>
          <div className="text-xl md:text-2xl font-bold text-gray-900">{formatEur(s.grossRevenue)}</div>
        </div>
        <div className={`col-span-2 lg:col-span-1 rounded-2xl shadow-sm border-2 p-3 md:p-5 ${s.netProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="text-[11px] md:text-xs text-gray-500 mb-1">Beneficio neto</div>
          <div className={`text-xl md:text-2xl font-bold ${s.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatEur(s.netProfit)}
          </div>
        </div>
      </div>

      {/* Quarterly breakdown */}
      {quarters.length > 0 && (
        <>
          <div>
            <h3 className="font-semibold text-gray-900 text-base">Desglose trimestral &middot; {year}</h3>
            <p className="text-xs text-gray-500 mt-0.5">Comisiones - Reembolsos = Beneficio neto</p>
          </div>

          {/* MOBILE: Cards */}
          <div className="md:hidden space-y-3">
            {quarters.map((q) => (
              <div key={q.quarter} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-gray-900 text-sm">{q.label}</span>
                  <span className={`text-sm font-bold ${q.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatEur(q.netProfit)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-[10px] text-gray-400">Comisiones</div>
                    <div className="text-xs font-semibold text-gray-900">{formatEur(q.platformFees)}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-[10px] text-gray-400">IVA</div>
                    <div className="text-xs font-semibold text-blue-600">{formatEur(q.vatCollected)}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-[10px] text-gray-400">Reembolsos</div>
                    <div className="text-xs font-semibold text-red-500">{formatEur(q.totalRefunds)}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-[10px] text-gray-400">Ingreso bruto</div>
                    <div className="text-xs font-semibold text-gray-900">{formatEur(q.grossRevenue)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP: Table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Trimestre</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Comisiones</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">IVA recaudado</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Reembolsos</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Ingreso bruto</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Beneficio neto</th>
                </tr>
              </thead>
              <tbody>
                {quarters.map((q) => (
                  <tr key={q.quarter} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{q.label}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatEur(q.platformFees)}</td>
                    <td className="px-4 py-3 text-right text-blue-600">{formatEur(q.vatCollected)}</td>
                    <td className="px-4 py-3 text-right text-red-500">{formatEur(q.totalRefunds)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatEur(q.grossRevenue)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${q.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatEur(q.netProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="px-4 py-3 font-bold text-gray-900">TOTAL {year}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">{formatEur(s.totalPlatformFees)}</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-600">{formatEur(s.totalVatCollected)}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-500">{formatEur(s.totalRefunds)}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">{formatEur(s.grossRevenue)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${s.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatEur(s.netProfit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {quarters.length === 0 && (
        <EmptyState
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          }
          message={`No hay datos para el ejercicio ${year}`}
        />
      )}
    </div>
  );
}

// ============================================
// TAB: COMISIONES DE PLATAFORMA
// ============================================

const CONFIG_LABELS: Record<string, { label: string; suffix: string; step: string; min: string }> = {
  platform_fee: { label: 'Comision por operacion (IVA incluido)', suffix: '\u20ac', step: '0.1', min: '0' },
  min_topup: { label: 'Recarga minima del monedero', suffix: '\u20ac', step: '0.5', min: '0' },
  vat_rate: { label: 'Tipo de IVA', suffix: '%', step: '0.01', min: '0' },
};

function ComisionesTab() {
  const [configs, setConfigs] = useState<{ key: string; value: string; description: string | null; updatedAt: string }[]>([]);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    api.get('/admin/platform-config')
      .then(({ data: items }) => {
        if (!Array.isArray(items)) {
          setMessage({ type: 'error', text: 'Respuesta inesperada del servidor' });
          return;
        }
        setConfigs(items);
        const values: Record<string, string> = {};
        items.forEach((c: { key: string; value: string }) => {
          // Mostrar VAT como porcentaje (0.21 -> 21)
          values[c.key] = c.key === 'vat_rate'
            ? String(Math.round(parseFloat(c.value) * 100))
            : c.value;
        });
        setEditValues(values);
      })
      .catch(() => setMessage({ type: 'error', text: 'Error cargando configuracion' }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const entries = Object.entries(editValues).map(([key, value]) => ({
        key,
        // Convertir porcentaje a decimal para VAT
        value: key === 'vat_rate' ? String(parseFloat(value) / 100) : value,
      }));
      const { data: updated } = await api.post('/admin/platform-config', { entries });
      if (Array.isArray(updated)) {
        setConfigs((prev) => prev.map((c) => {
          const u = updated.find((x: { key: string }) => x.key === c.key);
          return u ? { ...c, value: u.value } : c;
        }));
      }
      setMessage({ type: 'success', text: 'Configuracion guardada correctamente. Los cambios se aplican de inmediato.' });
    } catch {
      setMessage({ type: 'error', text: 'Error al guardar la configuracion' });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = configs.some((c) => {
    const displayValue = c.key === 'vat_rate'
      ? String(Math.round(parseFloat(c.value) * 100))
      : c.value;
    return editValues[c.key] !== displayValue;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Comisiones y tarifas</h2>
        <p className="text-sm text-gray-500 mb-6">
          Ajusta las comisiones que cobra la plataforma. Los cambios se aplican de inmediato a nuevas operaciones.
        </p>

        <div className="space-y-5">
          {configs.map((config) => {
            const meta = CONFIG_LABELS[config.key] || { label: config.key, suffix: '', step: '0.01', min: '0' };
            return (
              <div key={config.key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="sm:w-64 flex-shrink-0">
                  <label className="block text-sm font-medium text-gray-900">{meta.label}</label>
                  {config.description && (
                    <p className="text-xs text-gray-400 mt-0.5">{config.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step={meta.step}
                    min={meta.min}
                    value={editValues[config.key] || ''}
                    onChange={(e) => setEditValues((prev) => ({ ...prev, [config.key]: e.target.value }))}
                    className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-right text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                  <span className="text-sm text-gray-500 w-6">{meta.suffix}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#FF6B35' }}
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {message && (
            <p className={`text-sm ${message.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
              {message.text}
            </p>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h3 className="text-sm font-medium text-amber-800 mb-2">Informacion importante</h3>
        <ul className="text-xs text-amber-700 space-y-1">
          <li>La comision por operacion es el precio final (IVA incluido) que se descuenta del monedero de cada parte al cerrar un acuerdo.</li>
          <li>La recarga minima determina el importe minimo que un usuario puede anadir a su monedero.</li>
          <li>El IVA se aplica sobre las recargas de monedero (no sobre las comisiones, que ya lo incluyen).</li>
          <li>Los cambios afectan solo a nuevas operaciones. Las transacciones ya realizadas no se modifican.</li>
        </ul>
      </div>
    </div>
  );
}

// ============================================
// TAB DEFINITIONS
// ============================================

type TabKey = 'resumen' | 'transacciones' | 'pnl' | 'dac7' | 'fiscal' | 'comisiones';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'transacciones', label: 'Transacciones' },
  { key: 'pnl', label: 'Cuenta Resultados' },
  { key: 'dac7', label: 'DAC7' },
  { key: 'fiscal', label: 'Obligaciones' },
  { key: 'comisiones', label: 'Comisiones' },
];

// ============================================
// INNER PAGE (uses useSearchParams)
// ============================================

function FinanzasPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [alerts, setAlerts] = useState<{ disputes?: number; reports?: number; verifications?: number }>({});

  const activeTab = (searchParams.get('tab') as TabKey) || 'resumen';

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || (user && user.role !== 'admin'))) {
      router.push('/dashboard');
    }
  }, [user, authLoading, isAuthenticated, router]);

  useEffect(() => {
    let cancelled = false;
    api.get('/admin/dashboard/alerts')
      .then(({ data }) => { if (!cancelled) setAlerts(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner spinner-lg mx-auto mb-4" />
          <div className="text-gray-500">Cargando finanzas...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (user && user.role !== 'admin')) {
    return null;
  }

  const handleTabChange = (tab: TabKey) => {
    router.push(`/admin/finanzas?tab=${tab}`);
  };

  return (
    <AdminLayout section="finanzas" title="Finanzas" alerts={alerts}>
      {/* Sub-tab pills - only desktop (mobile uses AdminLayout sub-nav) */}
      <div className="hidden md:block px-3 md:px-4 py-3">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
              style={activeTab === tab.key ? { backgroundColor: '#FF6B35' } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-3 md:px-4 pb-8">
        {activeTab === 'resumen' && <ResumenTab />}
        {activeTab === 'transacciones' && <TransaccionesTab />}
        {activeTab === 'pnl' && <CuentaResultadosTab />}
        {activeTab === 'dac7' && <Dac7Tab />}
        {activeTab === 'fiscal' && <ObligacionesFiscalesTab />}
        {activeTab === 'comisiones' && <ComisionesTab />}
      </div>
    </AdminLayout>
  );
}

// ============================================
// MAIN PAGE (wrapped in Suspense for useSearchParams)
// ============================================

export default function AdminFinanzasPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#FF6B35', borderTopColor: 'transparent' }} />
        </div>
      }
    >
      <FinanzasPageInner />
    </Suspense>
  );
}
