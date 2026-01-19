'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { experiencesApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Experience } from '@/types/experience';
import { getUploadUrl } from '@/lib/utils';
import BottomNav from '@/components/BottomNav';

export default function MyExperiencesPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'draft'>('all');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const fetchExperiences = async () => {
      try {
        const data = await experiencesApi.getMy();
        setExperiences(data);
      } catch {
        setError('No se pudieron cargar tus experiencias');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchExperiences();
    }
  }, [isAuthenticated]);

  const filteredExperiences = experiences.filter(exp => {
    if (filter === 'active') return exp.published;
    if (filter === 'draft') return !exp.published;
    return true;
  });

  const activeCount = experiences.filter(e => e.published).length;
  const draftCount = experiences.filter(e => !e.published).length;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner spinner-lg mx-auto mb-4" />
          <div className="text-gray-500">Cargando experiencias...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="font-semibold text-gray-900">Mis Experiencias</span>
          <div className="flex items-center gap-1">
            <Link href="/stats" className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-gray-900">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
            </Link>
            <Link href="/experiences/create" className="w-10 h-10 flex items-center justify-center text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        {experiences.length > 0 && (
          <div className="flex items-center gap-6 px-4 pb-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{experiences.length}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{activeCount}</div>
              <div className="text-xs text-gray-500">Activas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{draftCount}</div>
              <div className="text-xs text-gray-500">Borradores</div>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        {experiences.length > 0 && (
          <div className="flex gap-2 px-4 pb-3">
            {(['all', 'active', 'draft'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'all' && 'Todas'}
                {f === 'active' && 'Activas'}
                {f === 'draft' && 'Borradores'}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="mx-4 mt-4 bg-red-50 text-red-600 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {experiences.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-20">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center text-5xl mb-6">
            🎪
          </div>
          <h2 className="font-bold text-xl text-gray-900 mb-2">Crea tu primera experiencia</h2>
          <p className="text-gray-500 text-center mb-8 max-w-xs">
            Comparte tus tradiciones locales con viajeros de todo el mundo
          </p>
          <Link
            href="/experiences/create"
            className="px-8 py-4 bg-blue-500 text-white font-semibold rounded-full hover:bg-blue-600 transition-colors shadow-lg"
          >
            Crear experiencia
          </Link>
        </div>
      ) : filteredExperiences.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-gray-500">No hay experiencias con este filtro</p>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {filteredExperiences.map((experience) => (
            <Link
              key={experience.id}
              href={`/experiences/${experience.id}`}
              className="bg-white rounded-2xl overflow-hidden shadow-sm block hover:shadow-md transition-shadow"
            >
              <div className="flex">
                {/* Thumbnail */}
                <div className="w-28 h-28 flex-shrink-0 relative">
                  {experience.photos && experience.photos.length > 0 ? (
                    <img
                      src={getUploadUrl(experience.photos[0])}
                      alt={experience.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-4xl text-white/50">
                      🎉
                    </div>
                  )}
                  {/* Status badge */}
                  <div className="absolute top-2 left-2">
                    {experience.published ? (
                      <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                        Activa
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-amber-500 text-white text-xs font-medium rounded-full">
                        Borrador
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-3 min-w-0">
                  <p className="text-xs text-blue-600 font-medium mb-1">
                    {experience.festival.name}
                  </p>
                  <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm leading-tight mb-2">
                    {experience.title}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <span>📍 {experience.city}</span>
                    <span>·</span>
                    {experience.price ? (
                      <span className="font-bold text-gray-900">{experience.price}€</span>
                    ) : (
                      <span className="text-teal-600 font-medium">Intercambio</span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {experience.avgRating && experience.avgRating > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="text-yellow-500">★</span>
                        <span className="text-gray-700 font-medium">{experience.avgRating.toFixed(1)}</span>
                      </span>
                    )}
                    {experience._count?.reviews && experience._count.reviews > 0 && (
                      <span>{experience._count.reviews} reseñas</span>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex items-center pr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-300">
                    <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
