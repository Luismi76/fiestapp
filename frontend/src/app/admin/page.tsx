'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  adminApi,
  AdminDashboardStats,
  ChartDataPoint,
  MatchesStats,
  ConversionStats,
  ActiveUsersStats,
  TopExperience,
  TopHost,
} from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/MainLayout';

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
  // Pre-calculate cumulative offsets to avoid mutation during render
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

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [usersChart, setUsersChart] = useState<ChartDataPoint[]>([]);
  const [revenueChart, setRevenueChart] = useState<ChartDataPoint[]>([]);
  const [matchesStats, setMatchesStats] = useState<MatchesStats | null>(null);
  const [conversionStats, setConversionStats] = useState<ConversionStats | null>(null);
  const [activeUsersStats, setActiveUsersStats] = useState<ActiveUsersStats | null>(null);
  const [topExperiences, setTopExperiences] = useState<TopExperience[]>([]);
  const [topHosts, setTopHosts] = useState<TopHost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      } catch (err: unknown) {
        const error = err as { response?: { status?: number } };
        if (error.response?.status === 403) {
          setError('No tienes permisos de administrador');
        } else {
          setError('Error al cargar estadísticas');
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
          <div className="text-gray-500">Cargando panel de administración...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md text-center">
          <div className="text-5xl mb-4">&#128683;</div>
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
    <MainLayout>
      <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Panel de Administración</h1>
              <p className="text-sm text-gray-500">Hola, {user?.name}</p>
            </div>
            <Link href="/dashboard" className="text-sm text-secondary font-medium">
              Volver a la app
            </Link>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Quick Stats - Row 1 */}
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
              <div className="w-10 h-10 bg-emerald/10 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-emerald">
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
              <div className="w-10 h-10 bg-emerald/10 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-emerald">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald">{stats.revenue.platformCommissions.toFixed(2)} EUR</div>
                <div className="text-xs text-gray-500">Comisiones ({stats.revenue.agreementsClosed} acuerdos)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Desglose Financiero</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Comisiones - Ingresos reales */}
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
              <div className="text-xs text-emerald mt-1">{stats.revenue.agreementsClosed} acuerdos cerrados (1,50 EUR c/u x 2)</div>
            </div>

            {/* Recargas de usuarios */}
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
              <div className="text-xs text-secondary mt-1">{stats.revenue.topupsCount} recargas realizadas</div>
            </div>

            {/* Saldo en monederos */}
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
              <div className="text-xs text-secondary mt-1">Fondos disponibles de usuarios</div>
            </div>

            {/* Acuerdos cerrados */}
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
              <div className="text-xs text-accent mt-1">Experiencias completadas con éxito</div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
            <strong>Nota:</strong> Los ingresos de la plataforma provienen de la comisión de 1,50 EUR que se cobra a cada usuario (anfitrión y huésped) cuando se cierra un acuerdo. Las recargas son el dinero que los usuarios depositan en sus monederos para poder operar.
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
                    <div className="text-blue-100 text-sm">Usuarios activos (últimos {activeUsersStats.period})</div>
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
                    <div className="text-green-100 text-sm">Nuevos usuarios (30 días)</div>
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

        {/* Charts Row */}
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
                  label="Tasa de cancelación"
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

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Link
            href="/admin/users"
            className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3 hover:bg-gray-50 transition-colors"
          >
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-gray-900">Usuarios</div>
              <div className="text-xs text-gray-500">{stats.users.total} registrados</div>
            </div>
          </Link>

          <Link
            href="/admin/experiences"
            className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3 hover:bg-gray-50 transition-colors"
          >
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-gray-900">Experiencias</div>
              <div className="text-xs text-gray-500">{stats.experiences.published} activas</div>
            </div>
          </Link>

          <Link
            href="/admin/reports"
            className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3 hover:bg-gray-50 transition-colors"
          >
            <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-gray-900">Reportes</div>
              <div className="text-xs text-gray-500">Gestionar denuncias</div>
            </div>
          </Link>
        </div>

        {/* Stats Breakdown */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Desglose General</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-emerald">{stats.users.verified}</div>
              <div className="text-xs text-gray-500">Usuarios verificados</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-accent">{stats.users.unverified}</div>
              <div className="text-xs text-gray-500">Sin verificar</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-secondary">{stats.experiences.published}</div>
              <div className="text-xs text-gray-500">Exp. publicadas</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-secondary">{stats.reviews}</div>
              <div className="text-xs text-gray-500">Reseñas totales</div>
            </div>
          </div>
        </div>

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
                    index === 0 ? 'bg-accent/10 text-amber-700' :
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
                    <div className="text-xs text-gray-400">{exp.reviewCount} reseñas</div>
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
                    index === 0 ? 'bg-accent/10 text-amber-700' :
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

        {/* Recent Users */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Usuarios recientes</h2>
            <Link href="/admin/users" className="text-sm text-secondary">Ver todos</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {stats.recentUsers.map((recentUser) => (
              <div key={recentUser.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{recentUser.name}</div>
                  <div className="text-sm text-gray-500">{recentUser.email}</div>
                </div>
                {recentUser.verified ? (
                  <span className="px-2 py-1 bg-emerald/10 text-green-700 text-xs rounded-full">Verificado</span>
                ) : (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">Pendiente</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Experiences */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Experiencias recientes</h2>
            <Link href="/admin/experiences" className="text-sm text-secondary">Ver todas</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {stats.recentExperiences.map((exp) => (
              <div key={exp.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{exp.title}</div>
                  <div className="text-sm text-gray-500">{exp.city} - {exp.host.name}</div>
                </div>
                {exp.published ? (
                  <span className="px-2 py-1 bg-emerald/10 text-green-700 text-xs rounded-full">Activa</span>
                ) : (
                  <span className="px-2 py-1 bg-accent/10 text-amber-700 text-xs rounded-full">Borrador</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </MainLayout>
  );
}
