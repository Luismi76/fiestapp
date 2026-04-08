'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';
import ExperienceCard from '@/components/ExperienceCard';
import { ExperienceGridSkeleton } from '@/components/ui/Skeleton';
import BottomSheet from '@/components/BottomSheet';
import PriceRangeSlider from '@/components/PriceRangeSlider';
import { experiencesApi, festivalsApi, favoritesApi } from '@/lib/api';
import { Experience, Festival, ExperienceFilters, ExperienceType } from '@/types/experience';
import { useAuth } from '@/contexts/AuthContext';
import logger from '@/lib/logger';

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

const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
  </svg>
);

const ITEMS_PER_PAGE = 12;

function ExperiencesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Search and filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedType, setSelectedType] = useState<string>(searchParams.get('type') || '');
  const [selectedFestival, setSelectedFestival] = useState<string>(searchParams.get('festival') || '');
  const [selectedCity, setSelectedCity] = useState<string>(searchParams.get('city') || '');
  const [minPrice, setMinPrice] = useState<string>(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState<string>(searchParams.get('maxPrice') || '');
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sortBy') || 'newest');
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const loadExperiencesRef = useRef<((pageNum: number, append?: boolean) => Promise<void>) | null>(null);

  // Load favorite IDs when user is authenticated
  useEffect(() => {
    if (!user) {
      setFavoriteIds(new Set());
      return;
    }
    const loadFavorites = async () => {
      try {
        const ids = await favoritesApi.getFavoriteIds();
        setFavoriteIds(new Set(ids));
      } catch (error) {
        logger.error('Error loading favorite IDs:', error);
      }
    };
    loadFavorites();
  }, [user]);

  // Optimistic toggle favorite
  const handleToggleFavorite = useCallback(async (experienceId: string) => {
    if (!user) return;

    const wasFavorite = favoriteIds.has(experienceId);

    // Optimistic update
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (wasFavorite) {
        next.delete(experienceId);
      } else {
        next.add(experienceId);
      }
      return next;
    });

    try {
      await favoritesApi.toggleFavorite(experienceId, wasFavorite);
    } catch (error) {
      // Revert on error
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (wasFavorite) {
          next.add(experienceId);
        } else {
          next.delete(experienceId);
        }
        return next;
      });
      logger.error('Error toggling favorite:', error);
    }
  }, [user, favoriteIds]);

  // Sync filters to URL query params
  const updateUrlParams = useCallback((filters: {
    q?: string;
    type?: string;
    festival?: string;
    city?: string;
    minPrice?: string;
    maxPrice?: string;
    sortBy?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.type) params.set('type', filters.type);
    if (filters.festival) params.set('festival', filters.festival);
    if (filters.city) params.set('city', filters.city);
    if (filters.minPrice) params.set('minPrice', filters.minPrice);
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
    if (filters.sortBy && filters.sortBy !== 'newest') params.set('sortBy', filters.sortBy);

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [pathname, router]);

  // Update URL when filters change (skip first render to avoid loop)
  useEffect(() => {
    if (isFirstRender.current) return;
    updateUrlParams({
      q: searchQuery,
      type: selectedType,
      festival: selectedFestival,
      city: selectedCity,
      minPrice,
      maxPrice,
      sortBy,
    });
  }, [searchQuery, selectedType, selectedFestival, selectedCity, minPrice, maxPrice, sortBy, updateUrlParams]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      const [festRes, citiesRes] = await Promise.allSettled([
        festivalsApi.getAll(),
        experiencesApi.getCities(),
      ]);
      if (festRes.status === 'fulfilled') setFestivals(festRes.value || []);
      if (citiesRes.status === 'fulfilled') setCities(citiesRes.value || []);
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
      if (selectedType) filters.type = selectedType as ExperienceType;
      if (selectedFestival) filters.festivalId = selectedFestival;
      if (selectedCity) filters.city = selectedCity;
      if (minPrice) filters.minPrice = Number(minPrice);
      if (maxPrice) filters.maxPrice = Number(maxPrice);
      if (sortBy) filters.sortBy = sortBy as ExperienceFilters['sortBy'];

      const response = await experiencesApi.getAll(filters);

      if (append) {
        setExperiences(prev => [...prev, ...(response.data || [])]);
      } else {
        setExperiences(response.data || []);
      }

      setTotalResults(response.meta?.total || response.data?.length || 0);
      setHasMore((response.data?.length || 0) === ITEMS_PER_PAGE);
    } catch (error) {
      logger.error('Error loading experiences:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchQuery, selectedType, selectedFestival, selectedCity, minPrice, maxPrice, sortBy]);

  // Keep ref in sync
  loadExperiencesRef.current = loadExperiences;

  // Initial load and filter changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
    }
    setPage(1);
    loadExperiencesRef.current?.(1, false);
  }, [selectedType, selectedFestival, selectedCity, minPrice, maxPrice, sortBy]);

  // Search with debounce (skip initial render - handled by filter effect above)
  const searchInitialized = useRef(false);
  useEffect(() => {
    if (!searchInitialized.current) {
      searchInitialized.current = true;
      return;
    }
    const timer = setTimeout(() => {
      setPage(1);
      loadExperiencesRef.current?.(1, false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load more on page change
  useEffect(() => {
    if (page > 1) {
      loadExperiencesRef.current?.(page, true);
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
  const clearFilters = useCallback(() => {
    setSelectedType('');
    setSelectedFestival('');
    setSelectedCity('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('newest');
    setSearchQuery('');
    setShowFiltersModal(false);
  }, []);

  return (
    <MainLayout>
      <div className="min-h-screen">
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
                placeholder="Busca por fiesta, ciudad o tipo de experiencia..."
                className="w-full h-10 pl-10 pr-4 bg-gray-100 rounded-full text-sm placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Link href="/map" className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-primary" aria-label="Ver mapa" title="Mapa">
              <MapIcon />
            </Link>
            <Link href="/calendar" className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-primary" aria-label="Ver calendario" title="Calendario">
              <CalendarIcon />
            </Link>
            <button
              onClick={() => setShowFiltersModal(true)}
              aria-label={`Filtros${activeFiltersCount > 0 ? ` (${activeFiltersCount} activos)` : ''}`}
              title="Filtros"
              className={`relative w-10 h-10 flex items-center justify-center rounded-full lg:hidden ${
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

        {/* Desktop layout: sidebar + content */}
        <div className="lg:flex lg:gap-6 px-4 md:px-6 lg:px-8">
          {/* Desktop sidebar filters */}
          <aside className="hidden lg:block lg:w-72 lg:flex-shrink-0 lg:sticky lg:top-20 lg:self-start">
            <div className="card p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg text-[#1A1410]">Filtros</h3>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-primary font-semibold hover:text-primary-dark transition-colors"
                  >
                    Limpiar
                  </button>
                )}
              </div>

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
                      className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
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

              {/* Festividad */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Festividad</label>
                <select
                  value={selectedFestival}
                  onChange={(e) => setSelectedFestival(e.target.value)}
                  className="w-full py-2.5 px-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Todas las festividades</option>
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
                  className="w-full py-2.5 px-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Todas las ciudades</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              {/* Price range */}
              <PriceRangeSlider
                minValue={minPrice}
                maxValue={maxPrice}
                onMinChange={setMinPrice}
                onMaxChange={setMaxPrice}
              />

              {/* Sort */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Ordenar por</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full py-2.5 px-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="newest">M&aacute;s recientes</option>
                  <option value="price_asc">Precio: menor a mayor</option>
                  <option value="price_desc">Precio: mayor a menor</option>
                  <option value="rating">Mejor valoradas</option>
                </select>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Results count */}
            {!loading && (
              <div className="py-3 flex items-center justify-between">
                <p className="text-sm text-[#8B7355]">
                  <span className="font-semibold text-[#1A1410]">{totalResults}</span> experiencia{totalResults !== 1 ? 's' : ''}
                </p>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="lg:hidden text-sm text-primary font-semibold flex items-center gap-1 hover:text-primary-dark transition-colors"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}

            {/* Results */}
            {loading ? (
              <ExperienceGridSkeleton count={8} />
            ) : experiences.length === 0 ? (
              <div className="empty-state">
                {activeFiltersCount > 0 || searchQuery ? (
                  <>
                    <div className="text-[#A89880] mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
                      </svg>
                    </div>
                    <h3 className="empty-state-title">Sin resultados para tu búsqueda</h3>
                    <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                      {searchQuery && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                          </svg>
                          &ldquo;{searchQuery}&rdquo;
                        </span>
                      )}
                      {selectedType && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 rounded-full text-sm text-primary font-medium">
                          {selectedType === 'pago' ? 'De pago' : selectedType === 'intercambio' ? 'Intercambio' : 'Flexible'}
                        </span>
                      )}
                      {selectedFestival && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-secondary/10 rounded-full text-sm text-secondary font-medium">
                          {festivals.find(f => f.id === selectedFestival)?.name || 'Festividad'}
                        </span>
                      )}
                      {selectedCity && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-accent/10 rounded-full text-sm text-accent font-medium">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                          </svg>
                          {selectedCity}
                        </span>
                      )}
                      {(minPrice || maxPrice) && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 rounded-full text-sm text-green-700 font-medium">
                          {minPrice && maxPrice ? `${minPrice}€ - ${maxPrice}€` : minPrice ? `Desde ${minPrice}€` : `Hasta ${maxPrice}€`}
                        </span>
                      )}
                    </div>
                    <p className="empty-state-text">
                      No encontramos experiencias con estos filtros. Prueba a ampliar tu búsqueda.
                    </p>
                    <button onClick={clearFilters} className="btn btn-primary">
                      Limpiar filtros y ver todo
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-[#A89880] mb-4">
                      <SparklesIcon />
                    </div>
                    <h3 className="empty-state-title">Aún no hay experiencias publicadas</h3>
                    <p className="empty-state-text">
                      Sé el primero en compartir una experiencia festiva o explora las festividades más populares de España.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Link href="/calendar" className="btn btn-primary">
                        Explorar festividades
                      </Link>
                      <Link href="/experiences/create" className="btn btn-secondary">
                        Crear experiencia
                      </Link>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 stagger-children">
                  {experiences.map((exp) => (
                    <ExperienceCard
                      key={exp.id}
                      experience={exp}
                      isFavorite={user ? favoriteIds.has(exp.id) : undefined}
                      onToggleFavorite={user ? handleToggleFavorite : undefined}
                    />
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
        </div>

        {/* Filters BottomSheet - mobile only */}
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

            {/* Festividad */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Festividad</label>
              <select
                value={selectedFestival}
                onChange={(e) => setSelectedFestival(e.target.value)}
                className="w-full py-3 px-4 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Todas las festividades</option>
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
            <PriceRangeSlider
              minValue={minPrice}
              maxValue={maxPrice}
              onMinChange={setMinPrice}
              onMaxChange={setMaxPrice}
            />

            {/* Sort */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Ordenar por</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full py-3 px-4 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="newest">M&aacute;s recientes</option>
                <option value="price_asc">Precio: menor a mayor</option>
                <option value="price_desc">Precio: mayor a menor</option>
                <option value="rating">Mejor valoradas</option>
              </select>
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
