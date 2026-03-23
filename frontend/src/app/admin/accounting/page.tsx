'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/MainLayout';
import { AdminHeader } from '@/components/admin';
import AdminNav from '@/components/admin/AdminNav';
import api from '@/lib/api';

// ============================================
// TYPES
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
}

interface DashboardData {
  kpis: DashboardKpi;
  revenueChart: RevenueDataPoint[];
}

interface Transaction {
  id: string;
  date: string;
  userName: string;
  userEmail: string;
  type: 'platform_fee' | 'topup' | 'refund' | 'experience_payment' | 'payment';
  amount: number;
  status: 'completed' | 'pending' | 'cancelled' | 'refunded';
  description: string;
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
    return data;
  },

  getModelo347: async (year: number): Promise<Modelo347Response> => {
    const { data } = await api.get(`/admin/accounting/modelo347?year=${year}`);
    return data;
  },

  getVatSummary: async (year: number, quarter: string): Promise<VatSummaryResponse> => {
    const { data } = await api.get(`/admin/accounting/vat-summary?year=${year}&quarter=${quarter}`);
    return data;
  },
};

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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        {change !== undefined && (
          <span
            className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
              change >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className={`w-3 h-3 ${change < 0 ? 'rotate-180' : ''}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function RevenueBarChart({
  data,
  granularity,
}: {
  data: RevenueDataPoint[];
  granularity: string;
}) {
  if (!data.length) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Ingresos por periodo</h3>
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
          Sin datos para el periodo seleccionado
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.revenue), 1);

  const formatLabel = (period: string) => {
    if (granularity === 'daily') {
      const parts = period.split('-');
      return `${parts[2]}/${parts[1]}`;
    }
    if (granularity === 'weekly') {
      return `S${period.split('-W')[1] || period.slice(-2)}`;
    }
    // monthly
    const parts = period.split('-');
    return parts[1] || period;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Ingresos por periodo</h3>
      <div className="flex items-end gap-1 h-40">
        {data.map((item, index) => {
          const height = (item.revenue / maxValue) * 100;
          return (
            <div key={index} className="flex-1 flex flex-col items-center min-w-0">
              <div
                className="w-full rounded-t transition-all duration-300 hover:opacity-80"
                style={{
                  height: `${height}%`,
                  backgroundColor: '#8B5CF6',
                  minHeight: item.revenue > 0 ? '4px' : '0',
                }}
                title={`${item.period}: ${formatEur(item.revenue)}`}
              />
              <span className="text-[9px] text-gray-400 mt-1 truncate w-full text-center">
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await accountingApi.getDashboard(startDate || undefined, endDate || undefined, granularity);
      setDashboardData(data);
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
    return (
      <div className="flex justify-center py-12">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
        {error}
        <button onClick={fetchDashboard} className="ml-3 underline font-medium">
          Reintentar
        </button>
      </div>
    );
  }

  if (!dashboardData) return null;

  const { kpis, revenueChart } = dashboardData;

  return (
    <div className="space-y-4">
      {/* Date range picker */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Desde</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hasta</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
            />
          </div>
          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            className="text-xs text-secondary font-medium px-3 py-2"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          label="Comisiones plataforma"
          value={formatEur(kpis.platformFees)}
          change={kpis.platformFeesChange}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-secondary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
        />
        <KpiCard
          label="Recargas wallet"
          value={formatEur(kpis.walletTopups)}
          change={kpis.walletTopupsChange}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-secondary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
            </svg>
          }
        />
        <KpiCard
          label="Pagos experiencias"
          value={formatEur(kpis.experiencePayments)}
          change={kpis.experiencePaymentsChange}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-secondary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
          }
        />
        <KpiCard
          label="Reembolsos"
          value={formatEur(kpis.refunds)}
          change={kpis.refundsChange}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-secondary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
            </svg>
          }
        />
        <KpiCard
          label="Saldo total wallets"
          value={formatEur(kpis.totalWalletBalance)}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-secondary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
            </svg>
          }
        />
        <KpiCard
          label="Operaciones"
          value={kpis.operationsCount.toLocaleString('es-ES')}
          change={kpis.operationsCountChange}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-secondary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          }
        />
      </div>

      {/* Chart + period selector */}
      <div className="space-y-2">
        <div className="flex gap-2">
          {(['daily', 'weekly', 'monthly'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Desde</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => { setFilterStartDate(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hasta</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => { setFilterEndDate(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo</label>
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="all">Todos</option>
              <option value="topup">Recarga</option>
              <option value="platform_fee">Comision</option>
              <option value="refund">Reembolso</option>
              <option value="experience_payment">Pago experiencia</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Estado</label>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="all">Todos</option>
              <option value="completed">Completado</option>
              <option value="pending">Pendiente</option>
              <option value="cancelled">Cancelado</option>
              <option value="refunded">Reembolsado</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Buscar</label>
            <form onSubmit={handleSearch} className="flex gap-1">
              <input
                type="text"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="Usuario o email..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
              />
            </form>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {pagination.total} transacciones encontradas
          </span>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-white rounded-lg text-xs font-medium hover:bg-secondary/90 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
          <button onClick={fetchTransactions} className="ml-3 underline font-medium">
            Reintentar
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="spinner spinner-lg" />
        </div>
      )}

      {/* Table */}
      {!loading && transactions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Usuario</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Tipo</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Importe</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Descripcion</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const tBadge = typeBadge[tx.type] || { label: tx.type, bg: 'bg-gray-100', text: 'text-gray-600' };
                  const sBadge = statusBadge[tx.status] || { label: tx.status, bg: 'bg-gray-100', text: 'text-gray-500' };
                  const isNegative = tx.type === 'refund' || tx.amount < 0;
                  return (
                    <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
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
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate hidden md:table-cell">
                        {tx.description}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && transactions.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
            </svg>
          </div>
          <p className="text-gray-500">No hay transacciones con estos filtros</p>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
          >
            Anterior
          </button>
          <div className="flex gap-1">
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
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
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
          <button
            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
            disabled={page === pagination.pages}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
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
    return (
      <div className="flex justify-center py-12">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
        {error}
        <button onClick={fetchDac7} className="ml-3 underline font-medium">
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { hosts, summary } = data;
  const incompleteCount = summary.incompleteData;

  return (
    <div className="space-y-4">
      {/* Year selector + export */}
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Ejercicio fiscal</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium"
          >
            {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-4 py-2 bg-secondary text-white rounded-lg text-sm font-medium hover:bg-secondary/90 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Exportar DAC7 (CSV)
        </button>
      </div>

      {/* Warning banner */}
      {incompleteCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="text-xs text-gray-500 mb-1">Total anfitriones</div>
          <div className="text-2xl font-bold text-gray-900">{summary.totalHosts}</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="text-xs text-gray-500 mb-1">Datos incompletos</div>
          <div className={`text-2xl font-bold ${incompleteCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
            {incompleteCount}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="text-xs text-gray-500 mb-1">Ingresos reportables totales</div>
          <div className="text-2xl font-bold text-gray-900">{formatEur(summary.totalReportableIncome)}</div>
        </div>
      </div>

      {/* Hosts table */}
      {hosts.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <p className="text-gray-500">No hay datos DAC7 para el ejercicio {year}</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// TAB: OBLIGACIONES FISCALES
// ============================================

function ObligacionesFiscalesTab() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [quarter, setQuarter] = useState('Q1');

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

  return (
    <div className="space-y-6">
      {/* Year + Quarter selectors */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Ejercicio</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium"
          >
            {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Trimestre (IVA)</label>
          <select
            value={quarter}
            onChange={(e) => setQuarter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium"
          >
            <option value="Q1">Q1 (Ene - Mar)</option>
            <option value="Q2">Q2 (Abr - Jun)</option>
            <option value="Q3">Q3 (Jul - Sep)</option>
            <option value="Q4">Q4 (Oct - Dic)</option>
          </select>
        </div>
      </div>

      {/* SECTION: Modelo 347 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Modelo 347 - Operaciones &gt;3.005,06 EUR</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Declaracion anual de operaciones con terceros que superen 3.005,06 EUR
            </p>
          </div>
          <button
            onClick={handleExport347}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-white rounded-lg text-xs font-medium hover:bg-secondary/90 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Exportar 347 (CSV)
          </button>
        </div>

        {error347 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            {error347}
            <button onClick={fetch347} className="ml-3 underline font-medium">Reintentar</button>
          </div>
        )}

        {loading347 ? (
          <div className="flex justify-center py-8">
            <div className="spinner spinner-lg" />
          </div>
        ) : modelo347 && modelo347.entries.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
        ) : (
          <div className="text-center py-8 bg-white rounded-2xl shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm">No hay operaciones que superen el umbral de 3.005,06 EUR en {year}</p>
          </div>
        )}
      </div>

      {/* SECTION: Resumen IVA */}
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold text-gray-900">Resumen IVA - {quarter} {year}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Desglose de operaciones e IVA al 21% para el trimestre seleccionado
          </p>
        </div>

        {errorVat && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            {errorVat}
            <button onClick={fetchVat} className="ml-3 underline font-medium">Reintentar</button>
          </div>
        )}

        {loadingVat ? (
          <div className="flex justify-center py-8">
            <div className="spinner spinner-lg" />
          </div>
        ) : vatSummary ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Concepto</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">N.o Operaciones</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Importe bruto</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Base imponible</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Cuota IVA (21%)</th>
                  </tr>
                </thead>
                <tbody>
                  {vatSummary.rows.map((row, index) => (
                    <tr key={index} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{row.concept}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{row.operationsCount}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatEur(row.grossAmount)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatEur(row.taxableBase)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatEur(row.vatAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td className="px-4 py-3 font-bold text-gray-900">TOTAL</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{vatSummary.totals.operationsCount}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{formatEur(vatSummary.totals.grossAmount)}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{formatEur(vatSummary.totals.taxableBase)}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{formatEur(vatSummary.totals.vatAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 bg-white rounded-2xl shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm">No hay datos de IVA para {quarter} {year}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

type TabKey = 'resumen' | 'transacciones' | 'dac7' | 'obligaciones';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'transacciones', label: 'Transacciones' },
  { key: 'dac7', label: 'Informe DAC7' },
  { key: 'obligaciones', label: 'Obligaciones fiscales' },
];

export default function AdminAccountingPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('resumen');

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || (user && user.role !== 'admin'))) {
      router.push('/dashboard');
    }
  }, [user, authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner spinner-lg mx-auto mb-4" />
          <div className="text-gray-500">Cargando contabilidad...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (user && user.role !== 'admin')) {
    return null;
  }

  return (
    <MainLayout hideNav>
      <div className="min-h-screen bg-gray-50 pb-8">
        <AdminHeader title="Contabilidad" />
        <AdminNav />

        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-100">
          <div className="flex overflow-x-auto px-4">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={activeTab === tab.key ? { borderColor: '#FF6B35', color: '#FF6B35' } : {}}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'resumen' && <ResumenTab />}
          {activeTab === 'transacciones' && <TransaccionesTab />}
          {activeTab === 'dac7' && <Dac7Tab />}
          {activeTab === 'obligaciones' && <ObligacionesFiscalesTab />}
        </div>
      </div>
    </MainLayout>
  );
}
