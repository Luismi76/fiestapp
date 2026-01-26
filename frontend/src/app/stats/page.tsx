'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usersApi, HostStats } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { getAvatarUrl, formatTimeAgo } from '@/lib/utils';
import MainLayout from '@/components/MainLayout';
import logger from '@/lib/logger';

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  completed: 'Completada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
};

const statusColors: Record<string, string> = {
  pending: 'text-amber-600 bg-amber-50',
  accepted: 'text-green-600 bg-green-50',
  completed: 'text-blue-600 bg-blue-50',
  rejected: 'text-red-600 bg-red-50',
  cancelled: 'text-gray-600 bg-gray-100',
};

export default function StatsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<HostStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadStats();
    }
  }, [user, authLoading, router]);

  const loadStats = async () => {
    try {
      const data = await usersApi.getHostStats();
      setStats(data);
    } catch (err) {
      setError('No se pudieron cargar las estadísticas');
      logger.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="spinner spinner-lg mx-auto mb-4" />
            <p className="text-gray-500">Cargando estadísticas...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !stats) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-white md:bg-transparent pb-24 md:pb-8">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="flex items-center px-4 h-14">
            <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <span className="font-semibold ml-2">Estadísticas</span>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center px-6 py-20">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-red-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <p className="text-gray-500">{error || 'Error al cargar estadísticas'}</p>
        </div>
      </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
    <div className="min-h-screen bg-white md:bg-gray-50 pb-24 md:pb-8">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 md:px-6 lg:px-8 h-14 lg:h-16 max-w-5xl mx-auto">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center md:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="font-semibold text-gray-900 md:text-xl">Mis estadísticas</h1>
          <div className="w-10 md:hidden" />
        </div>
      </header>

      {/* Content */}
      <div className="p-4 md:px-6 lg:px-8 max-w-5xl mx-auto">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          {/* Total Experiences */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-purple-600">
                  <path d="M10.362 1.093a.75.75 0 0 0-.724 0L2.523 5.018 10 9.143l7.477-4.125-7.115-3.925ZM18 6.443l-7.25 4v8.25l6.862-3.786A.75.75 0 0 0 18 14.25V6.443ZM9.25 18.693v-8.25l-7.25-4v7.807a.75.75 0 0 0 .388.657l6.862 3.786Z" />
                </svg>
              </div>
              <span className="text-xs text-gray-500">Experiencias</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.summary.totalExperiences}</p>
            <p className="text-xs text-gray-400 mt-1">{stats.summary.publishedExperiences} publicadas</p>
          </div>

          {/* Total Requests */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-600">
                  <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
                </svg>
              </div>
              <span className="text-xs text-gray-500">Solicitudes</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.summary.totalRequests}</p>
            <p className="text-xs text-gray-400 mt-1">{stats.summary.completedExperiences} completadas</p>
          </div>

          {/* Completion Rate */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-600">
                  <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xs text-gray-500">Completado</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.summary.completionRate}%</p>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
              <div
                className="bg-green-500 h-1.5 rounded-full"
                style={{ width: `${stats.summary.completionRate}%` }}
              />
            </div>
          </div>

          {/* Average Rating */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-yellow-600">
                  <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xs text-gray-500">Valoración</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.summary.avgRating > 0 ? stats.summary.avgRating.toFixed(1) : '-'}
            </p>
            <p className="text-xs text-gray-400 mt-1">{stats.summary.totalFavorites} favoritos</p>
          </div>
        </div>

        {/* Experience Stats */}
        {stats.experiences.length > 0 && (
          <div className="mb-6">
            <h2 className="font-semibold text-gray-900 md:text-lg mb-3">Rendimiento por experiencia</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {stats.experiences.map((exp) => (
                <Link
                  key={exp.id}
                  href={`/experiences/${exp.id}`}
                  className="block bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900 line-clamp-1">{exp.title}</h3>
                    {!exp.published && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Borrador</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{exp.city}</p>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{exp.totalRequests}</p>
                      <p className="text-[10px] text-gray-400">Solicitudes</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-green-600">{exp.completed}</p>
                      <p className="text-[10px] text-gray-400">Completadas</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{exp.totalFavorites}</p>
                      <p className="text-[10px] text-gray-400">Favoritos</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-yellow-600">
                        {exp.avgRating > 0 ? exp.avgRating.toFixed(1) : '-'}
                      </p>
                      <p className="text-[10px] text-gray-400">Valoración</p>
                    </div>
                  </div>

                  {exp.pending > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                        {exp.pending} solicitud{exp.pending !== 1 ? 'es' : ''} pendiente{exp.pending !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {stats.recentActivity.length > 0 && (
          <div>
            <h2 className="font-semibold text-gray-900 md:text-lg mb-3">Actividad reciente</h2>
            <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 md:grid md:grid-cols-2 md:divide-y-0 md:gap-px md:bg-gray-200 md:overflow-hidden">
              {stats.recentActivity.map((activity) => (
                <Link
                  key={activity.id}
                  href={`/matches/${activity.id}`}
                  className="flex items-center gap-3 p-4 bg-white hover:bg-gray-50 transition-colors"
                >
                  <img
                    src={getAvatarUrl(activity.requester.avatar)}
                    alt={activity.requester.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.requester.name}</p>
                    <p className="text-xs text-gray-500 truncate">{activity.experience.title}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[activity.status]}`}>
                      {statusLabels[activity.status]}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-1">{formatTimeAgo(activity.createdAt)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {stats.experiences.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Sin experiencias aún</h3>
            <p className="text-gray-500 text-sm mb-6">Crea tu primera experiencia para empezar a ver estadísticas</p>
            <Link
              href="/experiences/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </svg>
              Crear experiencia
            </Link>
          </div>
        )}
      </div>
    </div>
    </MainLayout>
  );
}
