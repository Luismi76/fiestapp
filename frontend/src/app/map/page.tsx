'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { experiencesApi } from '@/lib/api';
import { Experience } from '@/types/experience';
import { getUploadUrl } from '@/lib/utils';
import ExperienceMap, { MapFilter } from '@/components/ExperienceMap';
import BottomNav from '@/components/BottomNav';

const FILTER_OPTIONS: { value: MapFilter; label: string; icon: React.ReactNode; color: string }[] = [
  {
    value: 'all',
    label: 'Todas',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    color: 'bg-gray-500',
  },
  {
    value: 'intercambio',
    label: 'Intercambio',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    color: 'bg-green-500',
  },
  {
    value: 'pago',
    label: 'De pago',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'bg-primary',
  },
];

export default function MapPage() {
  const router = useRouter();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [filter, setFilter] = useState<MapFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const loadExperiences = async () => {
      try {
        const response = await experiencesApi.getAll();
        setExperiences(response.data || []);
      } catch (error) {
        console.error('Error loading experiences:', error);
      } finally {
        setLoading(false);
      }
    };

    loadExperiences();
  }, []);

  // Count experiences by type
  const counts = {
    all: experiences.length,
    intercambio: experiences.filter(e => e.type === 'intercambio').length,
    pago: experiences.filter(e => e.type === 'pago').length,
  };

  const filteredCount = filter === 'all' ? counts.all : counts[filter as keyof typeof counts] || 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="font-semibold text-gray-900">Mapa de experiencias</h1>
          <Link
            href="/experiences"
            className="w-10 h-10 flex items-center justify-center rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          </Link>
        </div>
      </header>

      {/* Stats & Filters */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-gray-900 font-medium">
              {loading ? (
                <span className="inline-block w-32 h-4 bg-gray-200 rounded animate-pulse" />
              ) : (
                <>
                  <span className="text-primary font-bold">{filteredCount}</span>
                  {' '}experiencia{filteredCount !== 1 ? 's' : ''} en España
                </>
              )}
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              showFilters || filter !== 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
            </svg>
            Filtros
            {filter !== 'all' && (
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            )}
          </button>
        </div>

        {/* Filter Pills */}
        <div className={`overflow-hidden transition-all duration-300 ${showFilters ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="flex gap-2 pb-1 overflow-x-auto scrollbar-hide">
            {FILTER_OPTIONS.map((option) => {
              const isActive = filter === option.value;
              const count = option.value === 'all' ? counts.all : counts[option.value as keyof typeof counts] || 0;

              return (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? `${option.color} text-white shadow-lg scale-105`
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.icon}
                  {option.label}
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                    isActive ? 'bg-white/20' : 'bg-gray-200'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 pt-2 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            Intercambio
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-primary" />
            De pago
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-500" />
            Mixto
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="relative" style={{ height: 'calc(100vh - 220px)' }}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-3 flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
              </div>
              <p className="text-gray-600 font-medium">Cargando experiencias...</p>
              <p className="text-gray-400 text-sm mt-1">Preparando el mapa</p>
            </div>
          </div>
        ) : (
          <ExperienceMap
            experiences={experiences}
            height="100%"
            filter={filter}
            onExperienceClick={setSelectedExperience}
            showClustering={true}
          />
        )}

        {/* Floating action hint */}
        {!loading && !selectedExperience && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-100 flex items-center gap-2 text-sm text-gray-600 animate-bounce">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-primary">
              <path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
            </svg>
            Toca un marcador para ver detalles
          </div>
        )}
      </div>

      {/* Selected Experience Card */}
      {selectedExperience && (
        <div className="fixed bottom-20 left-4 right-4 z-40 animate-slide-up">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* Close button */}
            <button
              onClick={() => setSelectedExperience(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white" className="w-5 h-5">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>

            <Link href={`/experiences/${selectedExperience.id}`} className="flex">
              {/* Image */}
              <div className="relative w-32 h-32 flex-shrink-0">
                <img
                  src={getUploadUrl(selectedExperience.photos?.[0]) || '/images/feria_abril.png'}
                  alt={selectedExperience.title}
                  className="w-full h-full object-cover"
                />
                {/* Type badge */}
                <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium text-white ${
                  selectedExperience.type === 'intercambio' ? 'bg-green-500' : 'bg-primary'
                }`}>
                  {selectedExperience.type === 'intercambio' ? 'Intercambio' : `${selectedExperience.price}€`}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 p-4 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-primary font-semibold mb-0.5 truncate">
                      {selectedExperience.festival?.name}
                    </p>
                    <h3 className="font-bold text-gray-900 line-clamp-1">
                      {selectedExperience.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
                  </svg>
                  {selectedExperience.city}
                </div>

                <div className="flex items-center justify-between mt-3">
                  {/* Rating */}
                  {selectedExperience.avgRating && selectedExperience.avgRating > 0 ? (
                    <div className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-yellow-500">
                        <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
                      </svg>
                      <span className="font-semibold text-gray-900">{selectedExperience.avgRating.toFixed(1)}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Sin valoraciones</span>
                  )}

                  {/* View button */}
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    Ver detalles
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Animation styles */}
      <style jsx global>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <BottomNav />
    </div>
  );
}
