'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  adminApi,
  AdminDashboardStats,
  AdminDashboardAlerts,
  ChartDataPoint,
  MatchesStats,
  ConversionStats,
  ActiveUsersStats,
  TopExperience,
  TopHost,
} from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/MainLayout';
import AdminNav from '@/components/admin/AdminNav';

// Simple Bar Chart Component
function BarChart({ data, dataKey, color, label }: {
  data: ChartDataPoint[];
  dataKey: 'count' | 'revenue';
  color: string;
  label: string;
}) {
  const maxValue = Math.max(...data.map(d => d[dataKey] || 0), 1);

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-4">{label}</h3>
      <div className="flex items-end gap-1 h-32">
        {data.map((item, index) => {
          const value = item[dataKey] || 0;
          const height = (value / maxValue) * 100;
          const monthLabel = item.month.split('-')[1];
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div
                className="w-full rounded-t transition-all duration-300 hover:opacity-80"
                style={{
                  height: `${height}%`,
                  backgroundColor: color,
                  minHeight: value > 0 ? '4px' : '0'
                }}
                title={`${item.month}: ${dataKey === 'revenue' ? value.toFixed(2) + ' EUR' : value}`}
              />
              <span className="text-[10px] text-gray-400 mt-1">{monthLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Donut Chart Component
function DonutChart({ data, colors, labels }: {
  data: number[];
  colors: string[];
  labels: string[];
}) {
  const total = data.reduce((a, b) => a + b, 0) || 1;
  const offsets = data.reduce<number[]>((acc, _, index) => {
    const prev = index > 0 ? acc[index - 1] + (data[index - 1] / total) * 100 : 0;
    acc.push(prev);
    return acc;
  }, []);

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="transform -rotate-90">
          {data.map((value, index) => {
            const percentage = (value / total) * 100;
            const dashArray = `${percentage} ${100 - percentage}`;
            const dashOffset = -offsets[index];

            return (
              <circle
                key={index}
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={colors[index]}
                strokeWidth="20"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                className="transition-all duration-500"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-gray-900">{total}</span>
        </div>
      </div>
      <div className="space-y-1">
        {labels.map((label, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[index] }} />
            <span className="text-gray-600">{label}: {data[index]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Progress Bar Component
function ProgressBar({ value, max, color, label }: {
  value: number;
  max: number;
  color: string;
  label: string;
}) {
  const percentage = max > 0 ? (value / max) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{percentage.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// Alert Item Component
function AlertItem({ label, count, href, bg, border, text, badgeBg, icon }: {
  label: string;
  count: number;
  href: string;
  bg: string;
  border: string;
  text: string;
  badgeBg: string;
  icon: React.ReactNode;
}) {
  if (count === 0) return null;

  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-xl border hover:opacity-80 transition-opacity cursor-pointer"
      style={{ backgroundColor: bg, borderColor: border, color: text }}
    >
      <div className="flex-shrink-0">{icon}</div>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <span
        className="min-w-[24px] h-6 px-2 flex items-center justify-center text-white text-xs font-bold rounded-full"
        style={{ backgroundColor: badgeBg }}
      >
        {count}
      </span>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [alerts, setAlerts] = useState<AdminDashboardAlerts | null>(null);
  const [usersChart, setUsersChart] = useState<ChartDataPoint[]>([]);
  const [revenueChart, setRevenueChart] = useState<ChartDataPoint[]>([]);
  const [matchesStats, setMatchesStats] = useState<MatchesStats | null>(null);
  const [conversionStats, setConversionStats] = useState<ConversionStats | null>(null);
  const [activeUsersStats, setActiveUsersStats] = useState<ActiveUsersStats | null>(null);
  const [topExperiences, setTopExperiences] = useState<TopExperience[]>([]);
  const [topHosts, setTopHosts] = useState<TopHost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCharts, setShowCharts] = useState(false);
  const [showRankings, setShowRankings] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [
          dashboardData,
          usersChartData,
          revenueChartData,
          matchesData,
          conversionData,
          activeData,
          topExp,
          topHostsData,
        ] = await Promise.all([
          adminApi.getDashboardStats(),
          adminApi.getUsersChartData(6),
          adminApi.getRevenueChartData(6),
          adminApi.getMatchesStats(),
          adminApi.getConversionStats(),
          adminApi.getActiveUsersStats(7),
          adminApi.getTopExperiences(5),
          adminApi.getTopHosts(5),
        ]);

        setStats(dashboardData);
        setUsersChart(usersChartData);
        setRevenueChart(revenueChartData);
        setMatchesStats(matchesData);
        setConversionStats(conversionData);
        setActiveUsersStats(activeData);
        setTopExperiences(topExp);
        setTopHosts(topHostsData);

        // Alertas se cargan aparte para no bloquear el dashboard si falla
        adminApi.getDashboardAlerts().then(setAlerts).catch(() => {});
      } catch (err: unknown) {
        const error = err as { response?: { status?: number } };
        if (error.response?.status === 403) {
          setError('No tienes permisos de administrador');
        } else {
          setError('Error al cargar estadisticas');
        }
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchAllData();
    }
  }, [isAuthenticated]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner spinner-lg mx-auto mb-4" />
          <div className="text-gray-500">Cargando panel de administracion...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-red-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link href="/dashboard" className="text-secondary font-medium">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <MainLayout hideNav>
      <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Panel de Administracion</h1>
              <p className="text-sm text-gray-500">Hola, {user?.name}</p>
            </div>
            <Link href="/dashboard" className="text-sm text-secondary font-medium">
              Volver a la app
            </Link>
          </div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <AdminNav alerts={alerts ? {
        disputes: alerts.disputes.total,
        reports: alerts.reports.pending,
        verifications: alerts.verifications.pending,
      } : undefined} />

      <div className="p-4 space-y-4">
        {/* SECTION A: Centro de Alertas */}
        {alerts && alerts.totalPending > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <h2 className="font-semibold text-gray-900">Requiere atencion</h2>
              <span className="ml-auto text-xs text-gray-400">{alerts.totalPending} pendientes</span>
            </div>
            <div className="space-y-2">
              <AlertItem
                label="Disputas abiertas"
                count={alerts.disputes.open}
                href="/admin/disputes"
                bg="#FEF2F2" border="#FECACA" text="#B91C1C" badgeBg="#EF4444"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                }
              />
              <AlertItem
                label="Disputas en revision"
                count={alerts.disputes.underReview}
                href="/admin/disputes"
                bg="#FFFBEB" border="#FDE68A" text="#B45309" badgeBg="#F59E0B"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                }
              />
              <AlertItem
                label="Reportes pendientes"
                count={alerts.reports.pending}
                href="/admin/reports"
                bg="#FEF2F2" border="#FECACA" text="#B91C1C" badgeBg="#EF4444"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
                  </svg>
                }
              />
              <AlertItem
                label="Verificaciones pendientes"
                count={alerts.verifications.pending}
                href="/admin/verifications"
                bg="#EFF6FF" border="#BFDBFE" text="#1D4ED8" badgeBg="#3B82F6"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                }
              />
            </div>
            {alerts.users.withStrikes > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <Link href="/admin/users?filter=strikes" className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  {alerts.users.withStrikes} usuarios con strikes activos / {alerts.users.banned} baneados
                </Link>
              </div>
            )}
          </div>
        )}

        {/* SECTION B: KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-secondary">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.users.total}</div>
                <div className="text-xs text-gray-500">Usuarios</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-secondary">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.experiences.total}</div>
                <div className="text-xs text-gray-500">Experiencias</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-emerald-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.matches.completed}</div>
                <div className="text-xs text-gray-500">Completadas</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-emerald-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-600">{stats.revenue.platformCommissions.toFixed(2)} EUR</div>
                <div className="text-xs text-gray-500">Comisiones ({stats.revenue.agreementsClosed} acuerdos)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Desglose Financiero</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-green-700">INGRESOS PLATAFORMA</span>
              </div>
              <div className="text-2xl font-bold text-green-700">{stats.revenue.platformCommissions.toFixed(2)} EUR</div>
              <div className="text-xs text-green-600 mt-1">{stats.revenue.agreementsClosed} acuerdos cerrados</div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-blue-700">RECARGAS USUARIOS</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">{stats.revenue.userTopups.toFixed(2)} EUR</div>
              <div className="text-xs text-blue-600 mt-1">{stats.revenue.topupsCount} recargas realizadas</div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-purple-700">SALDO EN MONEDEROS</span>
              </div>
              <div className="text-2xl font-bold text-purple-700">{stats.revenue.totalWalletBalance.toFixed(2)} EUR</div>
              <div className="text-xs text-purple-600 mt-1">Fondos disponibles de usuarios</div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-amber-700">ACUERDOS CERRADOS</span>
              </div>
              <div className="text-2xl font-bold text-amber-700">{stats.revenue.agreementsClosed}</div>
              <div className="text-xs text-amber-600 mt-1">Experiencias completadas con exito</div>
            </div>
          </div>
        </div>

        {/* Active Users & Conversion */}
        {(activeUsersStats || conversionStats) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeUsersStats && (
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 shadow-sm text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold">{activeUsersStats.activeUsers}</div>
                    <div className="text-blue-100 text-sm">Usuarios activos (ultimos {activeUsersStats.period})</div>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {conversionStats && (
              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 shadow-sm text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold">+{conversionStats.newUsersLast30Days}</div>
                    <div className="text-green-100 text-sm">Nuevos usuarios (30 dias)</div>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Links with Badges */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3">Acceso rapido</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Link
              href="/admin/users"
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 text-sm">Usuarios</div>
                <div className="text-xs text-gray-500">{stats.users.total} registrados</div>
              </div>
            </Link>

            <Link
              href="/admin/experiences"
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 text-sm">Experiencias</div>
                <div className="text-xs text-gray-500">{stats.experiences.published} activas</div>
              </div>
            </Link>

            <Link
              href="/admin/disputes"
              className="relative flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 text-sm">Disputas</div>
                <div className="text-xs text-gray-500">Gestionar disputas</div>
              </div>
              {alerts && alerts.disputes.total > 0 && (
                <span className="absolute top-2 right-2 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
                  {alerts.disputes.total}
                </span>
              )}
            </Link>

            <Link
              href="/admin/reports"
              className="relative flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 text-sm">Reportes</div>
                <div className="text-xs text-gray-500">Gestionar denuncias</div>
              </div>
              {alerts && alerts.reports.pending > 0 && (
                <span className="absolute top-2 right-2 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
                  {alerts.reports.pending}
                </span>
              )}
            </Link>

            <Link
              href="/admin/verifications"
              className="relative flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 text-sm">Verificaciones</div>
                <div className="text-xs text-gray-500">Identidad de usuarios</div>
              </div>
              {alerts && alerts.verifications.pending > 0 && (
                <span className="absolute top-2 right-2 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
                  {alerts.verifications.pending}
                </span>
              )}
            </Link>

            <Link
              href="/admin/evaluaciones"
              className="relative flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 text-sm">Evaluaciones</div>
                <div className="text-xs text-gray-500">Feedback QA</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Matches Stats */}
        {matchesStats && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Estado de Reservas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DonutChart
                data={[
                  matchesStats.completed,
                  matchesStats.accepted,
                  matchesStats.pending,
                  matchesStats.rejected,
                  matchesStats.cancelled
                ]}
                colors={['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#6B7280']}
                labels={['Completadas', 'Aceptadas', 'Pendientes', 'Rechazadas', 'Canceladas']}
              />
              <div className="space-y-3">
                <ProgressBar
                  value={matchesStats.completionRate}
                  max={100}
                  color="#10B981"
                  label="Tasa de completado"
                />
                <ProgressBar
                  value={matchesStats.cancellationRate}
                  max={100}
                  color="#EF4444"
                  label="Tasa de cancelacion"
                />
                {conversionStats && (
                  <>
                    <ProgressBar
                      value={conversionStats.registrationToMatchRate}
                      max={100}
                      color="#3B82F6"
                      label="Registro a reserva"
                    />
                    <ProgressBar
                      value={conversionStats.matchToCompletionRate}
                      max={100}
                      color="#8B5CF6"
                      label="Reserva a completado"
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats Breakdown */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Desglose General</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-emerald-600">{stats.users.verified}</div>
              <div className="text-xs text-gray-500">Usuarios verificados</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-600">{stats.users.unverified}</div>
              <div className="text-xs text-gray-500">Sin verificar</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-secondary">{stats.experiences.published}</div>
              <div className="text-xs text-gray-500">Exp. publicadas</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-secondary">{stats.reviews}</div>
              <div className="text-xs text-gray-500">Resenas totales</div>
            </div>
          </div>
        </div>

        {/* Collapsible Charts */}
        <button
          onClick={() => setShowCharts(!showCharts)}
          className="w-full bg-white rounded-xl p-4 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <h3 className="font-semibold text-gray-900">Graficas</h3>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className={`w-5 h-5 text-gray-400 transition-transform ${showCharts ? 'rotate-180' : ''}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        {showCharts && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {usersChart.length > 0 && (
              <BarChart
                data={usersChart}
                dataKey="count"
                color="#3B82F6"
                label="Nuevos usuarios por mes"
              />
            )}
            {revenueChart.length > 0 && (
              <BarChart
                data={revenueChart}
                dataKey="revenue"
                color="#10B981"
                label="Comisiones por mes (EUR)"
              />
            )}
          </div>
        )}

        {/* Collapsible Rankings */}
        <button
          onClick={() => setShowRankings(!showRankings)}
          className="w-full bg-white rounded-xl p-4 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <h3 className="font-semibold text-gray-900">Top Rankings</h3>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className={`w-5 h-5 text-gray-400 transition-transform ${showRankings ? 'rotate-180' : ''}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        {showRankings && (
          <div className="space-y-4">
            {/* Top Experiences */}
            {topExperiences.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900">Top Experiencias</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {topExperiences.map((exp, index) => (
                    <div key={exp.id} className="p-4 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-amber-100 text-amber-700' :
                        index === 1 ? 'bg-gray-200 text-gray-600' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{exp.title}</div>
                        <div className="text-sm text-gray-500">{exp.city} - {exp.hostName}</div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-amber-400">
                            <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
                          </svg>
                          <span className="font-semibold text-gray-900">{exp.avgRating.toFixed(1)}</span>
                        </div>
                        <div className="text-xs text-gray-400">{exp.reviewCount} resenas</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Hosts */}
            {topHosts.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900">Top Anfitriones</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {topHosts.map((host, index) => (
                    <div key={host.id} className="p-4 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-amber-100 text-amber-700' :
                        index === 1 ? 'bg-gray-200 text-gray-600' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {index + 1}
                      </div>
                      {host.avatar ? (
                        <img src={host.avatar} alt={host.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 font-medium">{host.name.charAt(0)}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{host.name}</span>
                          {host.verified && (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500">
                              <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{host.city || 'Sin ciudad'}</div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-amber-400">
                            <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
                          </svg>
                          <span className="font-semibold text-gray-900">{host.avgRating.toFixed(1)}</span>
                        </div>
                        <div className="text-xs text-gray-400">{host.completedMatches} completados</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </MainLayout>
  );
}
