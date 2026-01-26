'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/MainLayout';
import api from '@/lib/api';
import logger from '@/lib/logger';

interface HostAnalytics {
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    growth: number;
  };
  bookings: {
    total: number;
    pending: number;
    completed: number;
    conversionRate: number;
  };
  reviews: {
    average: number;
    total: number;
    distribution: number[];
    trend: number;
  };
  topExperiences: Array<{
    id: string;
    title: string;
    bookings: number;
    rating: number;
  }>;
}

interface ChartData {
  month: string;
  revenue?: number;
  total?: number;
  completed?: number;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [analytics, setAnalytics] = useState<HostAnalytics | null>(null);
  const [revenueChart, setRevenueChart] = useState<ChartData[]>([]);
  const [bookingsChart, setBookingsChart] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadAnalytics();
    }
  }, [user, authLoading, router]);

  const loadAnalytics = async () => {
    try {
      const [analyticsRes, revenueRes, bookingsRes] = await Promise.all([
        api.get('/users/me/analytics'),
        api.get('/users/me/analytics/revenue'),
        api.get('/users/me/analytics/bookings'),
      ]);
      setAnalytics(analyticsRes.data);
      setRevenueChart(revenueRes.data);
      setBookingsChart(bookingsRes.data);
    } catch (err) {
      setError('No se pudieron cargar los analytics');
      logger.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Cargando analytics...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !analytics) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 pb-24">
          <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
            <div className="flex items-center px-4 h-14">
              <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
              <span className="font-semibold ml-2">Analytics</span>
            </div>
          </header>
          <div className="p-4 text-center">
            <p className="text-red-500">{error}</p>
            <button onClick={loadAnalytics} className="mt-4 px-4 py-2 bg-primary text-white rounded-full">
              Reintentar
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const maxRevenue = Math.max(...revenueChart.map(d => d.revenue || 0), 1);
  const maxBookings = Math.max(...bookingsChart.map(d => d.total || 0), 1);

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 pb-24">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center">
              <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
              <span className="font-semibold ml-2">Analytics de anfitrion</span>
            </div>
            <Link href="/stats" className="text-sm text-primary font-medium">
              Estadisticas basicas
            </Link>
          </div>
        </header>

        <div className="p-4 space-y-6">
          {/* Revenue Summary */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Ingresos</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-emerald-50 rounded-xl p-3">
                <p className="text-sm text-emerald-600">Total ganado</p>
                <p className="text-2xl font-bold text-emerald-700">{formatCurrency(analytics.revenue.total)}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-sm text-blue-600">Este mes</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(analytics.revenue.thisMonth)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${analytics.revenue.growth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {analytics.revenue.growth >= 0 ? '+' : ''}{analytics.revenue.growth}%
              </span>
              <span className="text-sm text-gray-500">vs mes anterior</span>
              {analytics.revenue.growth >= 0 ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-500">
                  <path fillRule="evenodd" d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500">
                  <path fillRule="evenodd" d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Ingresos ultimos 6 meses</h3>
            <div className="flex items-end gap-2 h-32">
              {revenueChart.map((data, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-emerald-400 rounded-t"
                    style={{ height: `${((data.revenue || 0) / maxRevenue) * 100}%`, minHeight: data.revenue ? '4px' : '0' }}
                  />
                  <span className="text-xs text-gray-500 mt-2">{data.month}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bookings Summary */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Reservas</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-purple-50 rounded-xl p-3">
                <p className="text-sm text-purple-600">Total reservas</p>
                <p className="text-2xl font-bold text-purple-700">{analytics.bookings.total}</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3">
                <p className="text-sm text-amber-600">Pendientes</p>
                <p className="text-2xl font-bold text-amber-700">{analytics.bookings.pending}</p>
              </div>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
              <span className="text-sm text-gray-600">Tasa de conversion</span>
              <span className="text-lg font-bold text-gray-900">{analytics.bookings.conversionRate}%</span>
            </div>
          </div>

          {/* Bookings Chart */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Reservas ultimos 6 meses</h3>
            <div className="flex items-end gap-2 h-32">
              {bookingsChart.map((data, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div className="w-full relative flex flex-col justify-end" style={{ height: '100%' }}>
                    <div
                      className="w-full bg-purple-200 rounded-t absolute bottom-0"
                      style={{ height: `${((data.total || 0) / maxBookings) * 100}%`, minHeight: data.total ? '4px' : '0' }}
                    />
                    <div
                      className="w-full bg-purple-500 rounded-t absolute bottom-0"
                      style={{ height: `${((data.completed || 0) / maxBookings) * 100}%`, minHeight: data.completed ? '4px' : '0' }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 mt-2">{data.month}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-200 rounded" />
                <span className="text-xs text-gray-500">Total</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded" />
                <span className="text-xs text-gray-500">Completadas</span>
              </div>
            </div>
          </div>

          {/* Reviews Summary */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Resenas</h2>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-gray-900">{analytics.reviews.average}</p>
                <div className="flex justify-center mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill={star <= Math.round(analytics.reviews.average) ? '#FBBF24' : '#E5E7EB'}
                      className="w-4 h-4"
                    >
                      <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-1">{analytics.reviews.total} resenas</p>
              </div>
              <div className="flex-1 space-y-2">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = analytics.reviews.distribution[stars - 1] || 0;
                  const percentage = analytics.reviews.total > 0 ? (count / analytics.reviews.total) * 100 : 0;
                  return (
                    <div key={stars} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-4">{stars}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {analytics.reviews.trend !== 0 && (
              <div className={`flex items-center gap-2 text-sm ${analytics.reviews.trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {analytics.reviews.trend >= 0 ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z" clipRule="evenodd" />
                  </svg>
                )}
                <span>
                  {analytics.reviews.trend >= 0 ? '+' : ''}{analytics.reviews.trend} puntos vs trimestre anterior
                </span>
              </div>
            )}
          </div>

          {/* Top Experiences */}
          {analytics.topExperiences.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Top experiencias</h2>
              <div className="space-y-3">
                {analytics.topExperiences.map((exp, idx) => (
                  <Link
                    key={exp.id}
                    href={`/experiences/${exp.id}`}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50"
                  >
                    <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{exp.title}</p>
                      <p className="text-sm text-gray-500">{exp.bookings} reservas</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="#FBBF24" className="w-4 h-4">
                        <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">
                        {exp.rating.toFixed(1)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
