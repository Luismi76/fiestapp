'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';
import ExperienceCard from '@/components/ExperienceCard';
import BottomSheet from '@/components/BottomSheet';
import { experiencesApi, festivalsApi } from '@/lib/api';
import { Experience, Festival, ExperienceFilters } from '@/types/experience';

// Icons
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>
);

const FilterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
  </svg>
);

const MapIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
  </svg>
);

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);

const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
  </svg>
);

const ITEMS_PER_PAGE = 12;

function ExperiencesContent() {
  const searchParams = useSearchParams();

  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>(searchParams.get('type') || '');
  const [selectedFestival, setSelectedFestival] = useState<string>(searchParams.get('festival') || '');
  const [selectedCity, setSelectedCity] = useState<string>(searchParams.get('city') || '');
  const [minPrice, setMinPrice] = useState<string>(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState<string>(searchParams.get('maxPrice') || '');
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Load initial data
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
        console.error('Error loading filters:', error);
      }
    };
    loadInitialData();
  }, []);

  // Load experiences
  const loadExperiences = useCallback(async (pageNum: number, append: boolean = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const filters: ExperienceFilters = {
        limit: ITEMS_PER_PAGE,
        page: pageNum,
      };

      if (searchQuery) filters.search = searchQuery;
      if (selectedType) filters.type = selectedType as any;
      if (selectedFestival) filters.festivalId = selectedFestival;
      if (selectedCity) filters.city = selectedCity;
      if (minPrice) filters.minPrice = Number(minPrice);
      if (maxPrice) filters.maxPrice = Number(maxPrice);

      const response = await experiencesApi.getAll(filters);

      if (append) {
        setExperiences(prev => [...prev, ...(response.data || [])]);
      } else {
        setExperiences(response.data || []);
      }

      setTotalResults(response.meta?.total || response.data?.length || 0);
      setHasMore((response.data?.length || 0) === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error loading experiences:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchQuery, selectedType, selectedFestival, selectedCity, minPrice, maxPrice]);

  // Initial load and filter changes
  useEffect(() => {
    setPage(1);
    loadExperiences(1, false);
  }, [selectedType, selectedFestival, selectedCity, minPrice, maxPrice]);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadExperiences(1, false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load more on page change
  useEffect(() => {
    if (page > 1) {
      loadExperiences(page, true);
    }
  }, [page]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore]);

  // Count active filters
  const activeFiltersCount = [selectedType, selectedFestival, selectedCity, minPrice, maxPrice].filter(Boolean).length;

  // Clear all filters
  const clearFilters = () => {
    setSelectedType('');
    setSelectedFestival('');
    setSelectedCity('');
    setMinPrice('');
    setMaxPrice('');
    setSearchQuery('');
    setShowFiltersModal(false);
  };

  return (
    <MainLayout>
      <div className="min-h-screen pb-24 md:pb-8">
        {/* Header - compact */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200">
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <SearchIcon />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar experiencias..."
                className="w-full h-10 pl-10 pr-4 bg-gray-100 rounded-full text-sm placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Link href="/map" className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-primary">
              <MapIcon />
            </Link>
            <Link href="/calendar" className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-primary">
              <CalendarIcon />
            </Link>
            <button
              onClick={() => setShowFiltersModal(true)}
              className={`relative w-10 h-10 flex items-center justify-center rounded-full ${
                activeFiltersCount > 0 ? 'bg-primary text-white' : 'text-gray-600 hover:text-primary'
              }`}
            >
              <FilterIcon />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Results count */}
        {!loading && (
          <div className="px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-[#8B7355]">
              <span className="font-semibold text-[#1A1410]">{totalResults}</span> experiencia{totalResults !== 1 ? 's' : ''}
            </p>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary font-semibold flex items-center gap-1 hover:text-primary-dark transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {/* Results */}
        <div className="px-4 md:px-6 lg:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="spinner spinner-lg mx-auto mb-4" />
                <p className="text-[#8B7355]">Buscando experiencias...</p>
              </div>
            </div>
          ) : experiences.length === 0 ? (
            <div className="empty-state">
              <div className="text-[#A89880] mb-4">
                <SparklesIcon />
              </div>
              <h3 className="empty-state-title">Sin resultados</h3>
              <p className="empty-state-text">
                No encontramos experiencias con esos criterios. Prueba a cambiar los filtros.
              </p>
              <button onClick={clearFilters} className="btn btn-primary">
                Ver todas las experiencias
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 stagger-children">
                {experiences.map((exp) => (
                  <ExperienceCard key={exp.id} experience={exp} />
                ))}
              </div>

              {/* Load more trigger */}
              <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
                {loadingMore && (
                  <div className="spinner" />
                )}
                {!hasMore && experiences.length > 0 && (
                  <p className="text-sm text-[#A89880]">Has visto todas las experiencias</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Filters BottomSheet */}
        <BottomSheet
          isOpen={showFiltersModal}
          onClose={() => setShowFiltersModal(false)}
          title="Filtros"
          snapPoints={[0.7]}
          footer={
            <>
              <button
                onClick={clearFilters}
                className="btn btn-secondary flex-1"
              >
                Limpiar
              </button>
              <button
                onClick={() => setShowFiltersModal(false)}
                className="btn btn-primary flex-1"
              >
                Ver {totalResults} resultado{totalResults !== 1 ? 's' : ''}
              </button>
            </>
          }
        >
          <div className="space-y-6">
            {/* Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Tipo de experiencia</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: '', label: 'Todas' },
                  { value: 'pago', label: 'De pago' },
                  { value: 'intercambio', label: 'Intercambio' },
                  { value: 'ambos', label: 'Flexible' },
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className={`py-3 rounded-xl text-sm font-medium transition-colors ${
                      selectedType === type.value
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Festival */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Festival</label>
              <select
                value={selectedFestival}
                onChange={(e) => setSelectedFestival(e.target.value)}
                className="w-full py-3 px-4 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Todos los festivales</option>
                {festivals.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Ciudad</label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full py-3 px-4 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Todas las ciudades</option>
                {cities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {/* Price range */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Rango de precio</label>
              <div className="flex gap-3 items-center">
                <input
                  type="number"
                  min="0"
                  placeholder="Mín €"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="flex-1 py-3 px-4 bg-gray-100 rounded-xl text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <span className="text-gray-400">—</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Máx €"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="flex-1 py-3 px-4 bg-gray-100 rounded-xl text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>
        </BottomSheet>
      </div>
    </MainLayout>
  );
}

function ExperiencesLoading() {
  return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center pattern-festive">
        <div className="text-center">
          <div className="spinner spinner-lg mx-auto mb-4" />
          <p className="text-[#8B7355]">Cargando...</p>
        </div>
      </div>
    </MainLayout>
  );
}

export default function ExperiencesPage() {
  return (
    <Suspense fallback={<ExperiencesLoading />}>
      <ExperiencesContent />
    </Suspense>
  );
}
