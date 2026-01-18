'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { experiencesApi, festivalsApi } from '@/lib/api';
import { Experience, Festival } from '@/types/experience';
import { getUploadUrl, getAvatarUrl } from '@/lib/utils';

export default function ExperiencesPage() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedFestival, setSelectedFestival] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [expRes, festRes] = await Promise.all([
          experiencesApi.getAll(),
          festivalsApi.getAll(),
        ]);
        setExperiences(expRes.data || []);
        setFestivals(festRes || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredExperiences = experiences.filter((exp) => {
    const matchesSearch = !search ||
      exp.title.toLowerCase().includes(search.toLowerCase()) ||
      exp.city.toLowerCase().includes(search.toLowerCase()) ||
      exp.festival?.name.toLowerCase().includes(search.toLowerCase());
    const matchesFestival = !selectedFestival || exp.festivalId === selectedFestival;
    const matchesType = !selectedType || exp.type === selectedType;
    return matchesSearch && matchesFestival && matchesType;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-gray-900 mb-3">Explorar experiencias</h1>

          {/* Buscador */}
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre, ciudad o festival..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Filtros */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          <select
            value={selectedFestival}
            onChange={(e) => setSelectedFestival(e.target.value)}
            className="px-3 py-1.5 bg-gray-100 rounded-full text-sm font-medium text-gray-700 focus:outline-none"
          >
            <option value="">Todos los festivales</option>
            {festivals.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 bg-gray-100 rounded-full text-sm font-medium text-gray-700 focus:outline-none"
          >
            <option value="">Todos los tipos</option>
            <option value="pago">De pago</option>
            <option value="intercambio">Intercambio</option>
            <option value="ambos">Ambos</option>
          </select>
        </div>
      </header>

      {/* Resultados */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredExperiences.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            <p className="text-gray-500">No se encontraron experiencias</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">{filteredExperiences.length} experiencias encontradas</p>

            {filteredExperiences.map((exp) => (
              <Link
                key={exp.id}
                href={`/experiences/${exp.id}`}
                className="block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex">
                  {/* Imagen */}
                  <div className="w-32 h-32 flex-shrink-0">
                    <img
                      src={getUploadUrl(exp.photos?.[0] || '/images/feria_abril.png')}
                      alt={exp.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                          <path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
                        </svg>
                        {exp.city}
                      </div>
                      <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm">{exp.title}</h3>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={getAvatarUrl(exp.host?.avatar)}
                          alt={exp.host?.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <span className="text-xs text-gray-500">{exp.host?.name}</span>
                      </div>

                      <div className="text-right">
                        {exp.type === 'intercambio' ? (
                          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Intercambio</span>
                        ) : (
                          <span className="font-semibold text-primary">{exp.price}€</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
