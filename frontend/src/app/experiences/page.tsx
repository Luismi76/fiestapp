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
  const activeFiltersCount = [selectedFestival, selectedCity, minPrice, maxPrice].filter(Boolean).length;

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

  // Get tab styles
  const getTabStyles = (value: string) => {
    const isActive = selectedType === value;
    if (!isActive) return 'bg-white text-[#8B7355] hover:text-[#1A1410] shadow-sm';

    switch (value) {
      case 'pago':
        return 'badge-pago shadow-md';
      case 'intercambio':
        return 'badge-intercambio shadow-md';
      case 'ambos':
        return 'badge-flexible shadow-md';
      default:
        return 'gradient-sunset text-white shadow-md';
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen pb-24 md:pb-8">
        {/* Header with search */}
        <header className="sticky top-0 z-30 pattern-festive border-b border-primary/10">
          <div className="px-4 py-4">
            {/* Title and Search */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A89880]">
                  <SearchIcon />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar experiencias..."
                  className="input pl-12 pr-4 py-3 rounded-xl bg-white shadow-sm"
                />
              </div>
              <button
                onClick={() => setShowFiltersModal(true)}
                aria-label={`Filtros${activeFiltersCount > 0 ? ` (${activeFiltersCount} activos)` : ''}`}
                className={`relative w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center transition-all ripple ${
                  activeFiltersCount > 0
                    ? 'gradient-sunset text-white shadow-md'
                    : 'bg-white text-[#8B7355] shadow-sm hover:shadow-md ripple-dark'
                }`}
              >
                <FilterIcon />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-[#1A1410] text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-[var(--surface-warm)]">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>

            {/* Quick actions - Touch optimized */}
            <div className="flex items-center gap-2 mb-4">
              <Link
                href="/map"
                className="flex items-center gap-2 px-4 py-3 min-h-[44px] bg-white text-[#1A1410] rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all ripple ripple-dark"
              >
                <MapIcon />
                <span>Mapa</span>
              </Link>
              <Link
                href="/calendar"
                className="flex items-center gap-2 px-4 py-3 min-h-[44px] bg-white text-[#1A1410] rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all ripple ripple-dark"
              >
                <CalendarIcon />
                <span>Calendario</span>
              </Link>
            </div>

            {/* Type tabs - Accessible */}
            <div
              role="tablist"
              aria-label="Filtrar por tipo de experiencia"
              className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1"
            >
              {[
                { value: '', label: 'Todas' },
                { value: 'pago', label: 'De pago' },
                { value: 'intercambio', label: 'Intercambio' },
                { value: 'ambos', label: 'Flexible' },
              ].map((type) => (
                <button
                  key={type.value}
                  role="tab"
                  aria-selected={selectedType === type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold whitespace-nowrap transition-all ripple ${getTabStyles(type.value)}`}
                >
                  {type.label}
                </button>
              ))}
            </div>
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
        <div className="px-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
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
            {/* Festival */}
            <div>
              <label className="block text-sm font-semibold text-[#1A1410] mb-2">Festival</label>
              <select
                value={selectedFestival}
                onChange={(e) => setSelectedFestival(e.target.value)}
                className="input"
              >
                <option value="">Todos los festivales</option>
                {festivals.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-semibold text-[#1A1410] mb-2">Ciudad</label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="input"
              >
                <option value="">Todas las ciudades</option>
                {cities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {/* Price range */}
            <div>
              <label className="block text-sm font-semibold text-[#1A1410] mb-2">Rango de precio</label>
              <div className="flex gap-3 items-center">
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    placeholder="Mínimo"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="input"
                  />
                </div>
                <span className="text-[#A89880] font-medium">—</span>
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    placeholder="Máximo"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="input"
                  />
                </div>
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
