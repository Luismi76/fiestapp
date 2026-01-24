'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { experiencesApi } from '@/lib/api';
import { Experience } from '@/types/experience';
import { getUploadUrl } from '@/lib/utils';
import ExperienceMap, { MapFilter } from '@/components/ExperienceMap';
import MainLayout from '@/components/MainLayout';

// Iconos
const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);

const ListIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
  </svg>
);

const MapPinIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
  </svg>
);

const StarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
    <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
  </svg>
);

export default function MapPage() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [filter, setFilter] = useState<MapFilter>('all');

  useEffect(() => {
    experiencesApi.getAll({ limit: 100 })
      .then(response => setExperiences(response.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    all: experiences.length,
    intercambio: experiences.filter(e => e.type === 'intercambio').length,
    pago: experiences.filter(e => e.type === 'pago').length,
    ambos: experiences.filter(e => e.type === 'ambos').length,
  };

  return (
    <MainLayout>
    <div className="relative h-[calc(100dvh-4rem)] md:h-[calc(100dvh-6rem)] bg-gray-50">
        {/* Floating controls */}
        <div className="absolute top-3 left-3 right-3 z-50 flex items-center justify-between">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as MapFilter)}
            className="h-10 pl-3 pr-8 bg-white rounded-full text-sm font-medium shadow-md border-0 focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
              backgroundSize: '14px'
            }}
          >
            <option value="all">Todas ({counts.all})</option>
            <option value="pago">De pago ({counts.pago})</option>
            <option value="intercambio">Intercambio ({counts.intercambio})</option>
            <option value="ambos">Flexible ({counts.ambos})</option>
          </select>

          <Link
            href="/experiences"
            className="h-10 w-10 flex items-center justify-center bg-white rounded-full shadow-md text-gray-700 hover:text-primary"
          >
            <ListIcon />
          </Link>
        </div>

        {/* Map container */}
        <div className="absolute inset-0">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 gap-3">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Cargando experiencias...</p>
            </div>
          ) : experiences.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 gap-3 p-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                <MapPinIcon />
              </div>
              <p className="text-gray-600 text-center">No hay experiencias para mostrar en el mapa</p>
              <Link
                href="/experiences"
                className="px-4 py-2 bg-primary text-white rounded-full text-sm font-medium"
              >
                Ver todas las experiencias
              </Link>
            </div>
          ) : (
            <ExperienceMap
              experiences={experiences}
              height="h-full"
              filter={filter}
              onExperienceClick={setSelectedExperience}
            />
          )}
        </div>

        {/* Selected experience card */}
        {selectedExperience && (
          <div className="absolute bottom-4 left-4 right-4 z-[100] animate-slide-up">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              {/* Close button */}
              <button
                onClick={() => setSelectedExperience(null)}
                className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors"
              >
                <CloseIcon />
              </button>

              <Link href={`/experiences/${selectedExperience.id}`} className="flex">
                {/* Image */}
                <div className="w-28 h-28 flex-shrink-0 relative">
                  <img
                    src={getUploadUrl(selectedExperience.photos?.[0]) || '/images/placeholder.jpg'}
                    alt={selectedExperience.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Type badge */}
                  <div className="absolute bottom-2 left-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      selectedExperience.type === 'intercambio'
                        ? 'bg-teal-500 text-white'
                        : selectedExperience.type === 'ambos'
                          ? 'bg-purple-500 text-white'
                          : 'bg-emerald-500 text-white'
                    }`}>
                      {selectedExperience.type === 'intercambio'
                        ? 'Intercambio'
                        : selectedExperience.type === 'ambos'
                          ? 'Flexible'
                          : `${selectedExperience.price}€`}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-3 min-w-0 flex flex-col justify-center">
                  {selectedExperience.festival && (
                    <p className="text-xs text-primary font-medium truncate mb-0.5">
                      {selectedExperience.festival.name}
                    </p>
                  )}
                  <h3 className="font-semibold text-gray-900 line-clamp-1">
                    {selectedExperience.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPinIcon />
                      {selectedExperience.city}
                    </span>
                    {selectedExperience.avgRating !== undefined && selectedExperience.avgRating > 0 && (
                      <span className="flex items-center gap-0.5 text-xs">
                        <span className="text-yellow-500"><StarIcon /></span>
                        <span className="font-medium text-gray-700">{selectedExperience.avgRating.toFixed(1)}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">
                      Toca para ver detalles
                    </span>
                    <ChevronRightIcon />
                  </div>
                </div>
              </Link>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
