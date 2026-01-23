'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';
import ExperienceCard from '@/components/ExperienceCard';
import { experiencesApi, festivalsApi } from '@/lib/api';
import { Experience, Festival, ExperienceFilters, SortBy } from '@/types/experience';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Iconos SVG como componentes
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);

const FilterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
  </svg>
);

const MapIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
  </svg>
);

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
  </svg>
);

const GridIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
  </svg>
);

const ListIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
  </svg>
);

const SortIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
  </svg>
);

// Tipo para filtros activos con label
interface ActiveFilter {
  key: string;
  label: string;
  value: string;
  displayValue: string;
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchFocused, setSearchFocused] = useState(false);

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

  // Eliminar un filtro individual
  const removeFilter = (key: string) => {
    switch (key) {
      case 'search':
        setSearch('');
        break;
      case 'festival':
        setSelectedFestival('');
        break;
      case 'city':
        setSelectedCity('');
        break;
      case 'type':
        setSelectedType('');
        break;
      case 'minPrice':
        setMinPrice('');
        break;
      case 'maxPrice':
        setMaxPrice('');
        break;
    }
  };

  // Obtener lista de filtros activos para mostrar como chips
  const activeFilters = useMemo((): ActiveFilter[] => {
    const filters: ActiveFilter[] = [];

    if (debouncedSearch) {
      filters.push({
        key: 'search',
        label: 'Busqueda',
        value: debouncedSearch,
        displayValue: `"${debouncedSearch}"`,
      });
    }

    if (selectedFestival) {
      const festival = festivals.find(f => f.id === selectedFestival);
      filters.push({
        key: 'festival',
        label: 'Festival',
        value: selectedFestival,
        displayValue: festival?.name || selectedFestival,
      });
    }

    if (selectedCity) {
      filters.push({
        key: 'city',
        label: 'Ciudad',
        value: selectedCity,
        displayValue: selectedCity,
      });
    }

    if (selectedType) {
      const typeLabels: Record<string, string> = {
        'pago': 'De pago',
        'intercambio': 'Intercambio',
        'ambos': 'Flexible',
      };
      filters.push({
        key: 'type',
        label: 'Tipo',
        value: selectedType,
        displayValue: typeLabels[selectedType] || selectedType,
      });
    }

    if (minPrice) {
      filters.push({
        key: 'minPrice',
        label: 'Precio min',
        value: minPrice,
        displayValue: `${minPrice}EUR+`,
      });
    }

    if (maxPrice) {
      filters.push({
        key: 'maxPrice',
        label: 'Precio max',
        value: maxPrice,
        displayValue: `hasta ${maxPrice}EUR`,
      });
    }

    return filters;
  }, [debouncedSearch, selectedFestival, selectedCity, selectedType, minPrice, maxPrice, festivals]);

  // Contar filtros activos (sin incluir busqueda)
  const activeFiltersCount = [
    selectedFestival,
    selectedCity,
    selectedType,
    minPrice,
    maxPrice,
  ].filter(Boolean).length;

  // Etiquetas para ordenacion
  const sortLabels: Record<SortBy, string> = {
    'newest': 'Mas recientes',
    'price_asc': 'Precio: menor a mayor',
    'price_desc': 'Precio: mayor a menor',
    'rating': 'Mejor valoradas',
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="px-4 py-3">
          {/* Titulo y acciones */}
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900">Explorar</h1>
            <div className="flex items-center gap-2">
              {/* Toggle vista */}
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Vista lista"
                >
                  <ListIcon />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Vista cuadricula"
                >
                  <GridIcon />
                </button>
              </div>
              {/* Boton calendario */}
              <Link
                href="/calendar"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-600 rounded-full text-sm font-medium hover:bg-orange-200 transition-colors"
              >
                <CalendarIcon />
                <span className="hidden sm:inline">Calendario</span>
              </Link>
              {/* Boton mapa */}
              <Link
                href="/map"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                <MapIcon />
                <span className="hidden sm:inline">Mapa</span>
              </Link>
            </div>
          </div>

          {/* Barra de busqueda mejorada */}
          <div className={`relative transition-all duration-200 ${searchFocused ? 'scale-[1.02]' : ''}`}>
            <div className={`absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors ${searchFocused ? 'text-primary' : ''}`}>
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre, festival o ciudad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className={`w-full pl-10 pr-10 py-3 bg-gray-100 rounded-xl text-sm transition-all duration-200 ${
                searchFocused
                  ? 'bg-white ring-2 ring-primary/30 shadow-lg'
                  : 'focus:bg-white focus:ring-2 focus:ring-primary/20'
              }`}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <CloseIcon />
              </button>
            )}
            {/* Indicador de busqueda activa */}
            {loading && debouncedSearch && (
              <div className="absolute right-10 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Barra de filtros y ordenacion */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {/* Boton de filtros */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              showFilters
                ? 'bg-primary text-white shadow-md'
                : activeFiltersCount > 0
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FilterIcon />
            Filtros
            {activeFiltersCount > 0 && (
              <span className={`ml-0.5 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold ${
                showFilters ? 'bg-white/20' : 'bg-primary text-white'
              }`}>
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Ordenar */}
          <div className="relative">
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
              <SortIcon />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="pl-8 pr-8 py-2 bg-gray-100 rounded-full text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer hover:bg-gray-200 transition-colors"
            >
              <option value="newest">Mas recientes</option>
              <option value="price_asc">Precio: menor a mayor</option>
              <option value="price_desc">Precio: mayor a menor</option>
              <option value="rating">Mejor valoradas</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>

          {/* Tipo rapido - botones en lugar de select */}
          <div className="flex gap-1">
            {[
              { value: '', label: 'Todos' },
              { value: 'pago', label: 'De pago' },
              { value: 'intercambio', label: 'Intercambio' },
              { value: 'ambos', label: 'Flexible' },
            ].map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={`px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedType === type.value
                    ? type.value === 'pago'
                      ? 'bg-emerald-500 text-white'
                      : type.value === 'intercambio'
                        ? 'bg-teal-500 text-white'
                        : type.value === 'ambos'
                          ? 'bg-purple-500 text-white'
                          : 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chips de filtros activos */}
        {activeFilters.length > 0 && (
          <div className="px-4 pb-3 flex gap-2 flex-wrap">
            {activeFilters.map((filter) => (
              <span
                key={filter.key}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full"
              >
                <span className="text-primary/70">{filter.label}:</span>
                <span className="max-w-[120px] truncate">{filter.displayValue}</span>
                <button
                  onClick={() => removeFilter(filter.key)}
                  className="ml-0.5 p-0.5 hover:bg-primary/20 rounded-full transition-colors"
                >
                  <CloseIcon />
                </button>
              </span>
            ))}
            {activeFilters.length > 1 && (
              <button
                onClick={clearFilters}
                className="px-2.5 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
              >
                Limpiar todo
              </button>
            )}
          </div>
        )}

        {/* Panel de filtros expandido */}
        {showFilters && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-4 bg-gray-50/80 backdrop-blur-sm animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 gap-3">
              {/* Festival */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Festival</label>
                <select
                  value={selectedFestival}
                  onChange={(e) => setSelectedFestival(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                >
                  <option value="">Todos los festivales</option>
                  {festivals.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              {/* Ciudad */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Ciudad</label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                >
                  <option value="">Todas las ciudades</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              {/* Rango de precios */}
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Rango de precio</label>
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      placeholder="Min"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="w-full px-3 py-2.5 pr-10 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">EUR</span>
                  </div>
                  <span className="text-gray-400 font-medium">-</span>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      placeholder="Max"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-full px-3 py-2.5 pr-10 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">EUR</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Acciones del panel de filtros */}
            <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
              <button
                onClick={() => setShowFilters(false)}
                className="flex-1 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors"
              >
                Ver {totalResults} resultado{totalResults !== 1 ? 's' : ''}
              </button>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Contador de resultados */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 bg-white">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{totalResults}</span> experiencia{totalResults !== 1 ? 's' : ''} encontrada{totalResults !== 1 ? 's' : ''}
          {sortBy !== 'newest' && (
            <span className="text-gray-400 ml-1">
              · {sortLabels[sortBy]}
            </span>
          )}
        </p>
      </div>

      {/* Resultados */}
      <div className="p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Buscando experiencias...</p>
          </div>
        ) : experiences.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron experiencias</h3>
            <p className="text-gray-500 mb-6 max-w-xs mx-auto">
              Intenta ajustar los filtros o buscar con otros terminos
            </p>
            {activeFilters.length > 0 && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
              >
                <CloseIcon />
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid'
            ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4'
            : 'space-y-3'
          }>
            {experiences.map((exp) => (
              <ExperienceCard
                key={exp.id}
                experience={exp}
                variant={viewMode === 'grid' ? 'compact' : 'horizontal'}
              />
            ))}
          </div>
        )}
      </div>
      </div>
    </MainLayout>
  );
}
