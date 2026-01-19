'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { experiencesApi } from '@/lib/api';
import { Experience } from '@/types/experience';
import { getUploadUrl } from '@/lib/utils';
import ExperienceMap from '@/components/ExperienceMap';
import BottomNav from '@/components/BottomNav';

export default function MapPage() {
  const router = useRouter();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);

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

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="font-semibold text-gray-900">Mapa de experiencias</h1>
          <Link
            href="/experiences"
            className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-gray-900"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          </Link>
        </div>
      </header>

      {/* Stats */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">
              {loading ? 'Cargando...' : `${experiences.length} experiencias en toda España`}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
            </svg>
            Toca un marcador
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="relative" style={{ height: 'calc(100vh - 180px)' }}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="spinner spinner-lg mx-auto mb-4" />
              <p className="text-gray-500">Cargando experiencias...</p>
            </div>
          </div>
        ) : (
          <ExperienceMap
            experiences={experiences}
            height="100%"
            onExperienceClick={setSelectedExperience}
          />
        )}
      </div>

      {/* Selected Experience Card (optional overlay) */}
      {selectedExperience && (
        <div className="fixed bottom-20 left-4 right-4 z-40">
          <Link
            href={`/experiences/${selectedExperience.id}`}
            className="block bg-white rounded-2xl shadow-xl p-4 border border-gray-100"
          >
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                <img
                  src={getUploadUrl(selectedExperience.photos?.[0]) || '/images/feria_abril.png'}
                  alt={selectedExperience.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-primary font-medium mb-1">{selectedExperience.festival?.name}</p>
                <h3 className="font-semibold text-gray-900 line-clamp-1">{selectedExperience.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{selectedExperience.city}</p>
                <div className="flex items-center justify-between mt-2">
                  {selectedExperience.type === 'intercambio' ? (
                    <span className="text-sm font-medium text-green-600">Intercambio</span>
                  ) : (
                    <span className="text-sm font-semibold text-primary">{selectedExperience.price}€</span>
                  )}
                  {selectedExperience.avgRating && selectedExperience.avgRating > 0 && (
                    <div className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-yellow-500">
                        <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-600">{selectedExperience.avgRating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedExperience(null);
                }}
                className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-500">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>
          </Link>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
