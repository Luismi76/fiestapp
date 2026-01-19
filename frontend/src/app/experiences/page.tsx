'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { experiencesApi, festivalsApi } from '@/lib/api';
import { Experience, Festival, ExperienceFilters, SortBy } from '@/types/experience';
import { getUploadUrl, getAvatarUrl } from '@/lib/utils';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default function ExperiencesPage() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalResults, setTotalResults] = useState(0);

  // Filtros
  const [search, setSearch] = useState('');
  const [selectedFestival, setSelectedFestival] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Debounce para busqueda
  const debouncedSearch = useDebounce(search, 300);

  // Cargar festivales y ciudades al inicio
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [festRes, citiesRes] = await Promise.all([
          festivalsApi.getAll(),
          experiencesApi.getCities(),
        ]);
        setFestivals(festRes || []);
        setCities(citiesRes || []);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };
    loadInitialData();
  }, []);

  // Cargar experiencias cuando cambian los filtros
  const loadExperiences = useCallback(async () => {
    setLoading(true);
    try {
      const filters: ExperienceFilters = {
        limit: 50,
      };

      if (debouncedSearch) filters.search = debouncedSearch;
      if (selectedFestival) filters.festivalId = selectedFestival;
      if (selectedCity) filters.city = selectedCity;
      if (selectedType) filters.type = selectedType as 'pago' | 'intercambio' | 'ambos';
      if (minPrice) filters.minPrice = parseFloat(minPrice);
      if (maxPrice) filters.maxPrice = parseFloat(maxPrice);
      if (sortBy) filters.sortBy = sortBy;

      const response = await experiencesApi.getAll(filters);
      setExperiences(response.data || []);
      setTotalResults(response.meta?.total || 0);
    } catch (error) {
      console.error('Error fetching experiences:', error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedFestival, selectedCity, selectedType, minPrice, maxPrice, sortBy]);

  useEffect(() => {
    loadExperiences();
  }, [loadExperiences]);

  // Limpiar filtros
  const clearFilters = () => {
    setSearch('');
    setSelectedFestival('');
    setSelectedCity('');
    setSelectedType('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('newest');
    setShowFilters(false);
  };

  // Contar filtros activos
  const activeFiltersCount = [
    selectedFestival,
    selectedCity,
    selectedType,
    minPrice,
    maxPrice,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900">Explorar experiencias</h1>
            <Link
              href="/map"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
              </svg>
              Mapa
            </Link>
          </div>

          {/* Buscador */}
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar experiencias..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Filtros rapidos */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          {/* Boton de filtros */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeFiltersCount > 0
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
            Filtros
            {activeFiltersCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Ordenar */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-3 py-1.5 bg-gray-100 rounded-full text-sm font-medium text-gray-700 focus:outline-none"
          >
            <option value="newest">Mas recientes</option>
            <option value="price_asc">Precio: menor a mayor</option>
            <option value="price_desc">Precio: mayor a menor</option>
            <option value="rating">Mejor valoradas</option>
          </select>

          {/* Tipo rapido */}
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

        {/* Panel de filtros expandido */}
        {showFilters && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3 bg-gray-50">
            <div className="grid grid-cols-2 gap-3">
              {/* Festival */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Festival</label>
                <select
                  value={selectedFestival}
                  onChange={(e) => setSelectedFestival(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Todos</option>
                  {festivals.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              {/* Ciudad */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Ciudad</label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Todas</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              {/* Precio minimo */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Precio min.</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full px-3 py-2 pr-8 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">EUR</span>
                </div>
              </div>

              {/* Precio maximo */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Precio max.</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    placeholder="Sin limite"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full px-3 py-2 pr-8 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">EUR</span>
                </div>
              </div>
            </div>

            {/* Limpiar filtros */}
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="w-full py-2 text-sm font-medium text-red-600 hover:text-red-700"
              >
                Limpiar todos los filtros
              </button>
            )}
          </div>
        )}
      </header>

      {/* Resultados */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : experiences.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            <p className="text-gray-500 mb-4">No se encontraron experiencias</p>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-primary font-medium hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">{totalResults} experiencias encontradas</p>

            {experiences.map((exp) => (
              <Link
                key={exp.id}
                href={`/experiences/${exp.id}`}
                className="block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex">
                  {/* Imagen */}
                  <div className="w-32 h-32 flex-shrink-0 relative">
                    <img
                      src={getUploadUrl(exp.photos?.[0] || '/images/feria_abril.png')}
                      alt={exp.title}
                      className="w-full h-full object-cover"
                    />
                    {/* Rating badge */}
                    {exp.avgRating && exp.avgRating > 0 && (
                      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-yellow-500">
                          <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-medium text-gray-700">{exp.avgRating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                          <path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
                        </svg>
                        {exp.city}
                        {exp.festival && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span className="text-primary">{exp.festival.name}</span>
                          </>
                        )}
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
                        {exp.host?.verified && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-500">
                            <path fillRule="evenodd" d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>

                      <div className="text-right">
                        {exp.type === 'intercambio' ? (
                          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Intercambio</span>
                        ) : exp.type === 'ambos' ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="font-semibold text-primary">{exp.price}EUR</span>
                            <span className="text-xs text-green-600">o intercambio</span>
                          </div>
                        ) : (
                          <span className="font-semibold text-primary">{exp.price}EUR</span>
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
