'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { experiencesApi } from '@/lib/api';
import { Experience } from '@/types/experience';
import { getUploadUrl } from '@/lib/utils';
import ExperienceMap, { MapFilter } from '@/components/ExperienceMap';
import BottomNav from '@/components/BottomNav';

export default function MapPage() {
  const router = useRouter();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [filter, setFilter] = useState<MapFilter>('all');

  useEffect(() => {
    experiencesApi.getAll()
      .then(response => setExperiences(response.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    all: experiences.length,
    intercambio: experiences.filter(e => e.type === 'intercambio').length,
    pago: experiences.filter(e => e.type === 'pago').length,
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header - z-index 50 */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 z-50">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-semibold">Mapa</h1>
          <Link href="/experiences" className="p-2 -mr-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Link>
        </div>
      </header>

      {/* Filters - z-index 40 */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2 z-40">
        <div className="flex gap-2 overflow-x-auto">
          {[
            { value: 'all' as MapFilter, label: 'Todas', count: counts.all },
            { value: 'intercambio' as MapFilter, label: 'Intercambio', count: counts.intercambio },
            { value: 'pago' as MapFilter, label: 'De pago', count: counts.pago },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === opt.value
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {opt.label} ({opt.count})
            </button>
          ))}
        </div>
      </div>

      {/* Map container - z-index 0 */}
      <div className="flex-1 relative z-0">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ExperienceMap
            experiences={experiences}
            height="100%"
            filter={filter}
            onExperienceClick={setSelectedExperience}
          />
        )}
      </div>

      {/* Selected experience card - z-index 100 */}
      {selectedExperience && (
        <div className="absolute bottom-24 left-4 right-4 z-[100]">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setSelectedExperience(null)}
              className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center bg-black/50 rounded-full"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <Link href={`/experiences/${selectedExperience.id}`} className="flex">
              <img
                src={getUploadUrl(selectedExperience.photos?.[0]) || '/images/placeholder.jpg'}
                alt={selectedExperience.title}
                className="w-24 h-24 object-cover flex-shrink-0"
              />
              <div className="flex-1 p-3 min-w-0">
                <p className="text-xs text-primary font-medium truncate">{selectedExperience.festival?.name}</p>
                <h3 className="font-semibold text-gray-900 truncate">{selectedExperience.title}</h3>
                <p className="text-sm text-gray-500">{selectedExperience.city}</p>
                <p className={`text-sm font-medium mt-1 ${selectedExperience.type === 'intercambio' ? 'text-green-600' : 'text-primary'}`}>
                  {selectedExperience.type === 'intercambio' ? 'Intercambio' : `${selectedExperience.price}€`}
                </p>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Bottom nav - z-index 9999 (set in globals.css) */}
      <BottomNav />
    </div>
  );
}
