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
  const [hostHasPartner, setHostHasPartner] = useState(searchParams.get('hostHasPartner') === 'true');
  const [hostHasFriends, setHostHasFriends] = useState(searchParams.get('hostHasFriends') === 'true');
  const [hostHasChildren, setHostHasChildren] = useState(searchParams.get('hostHasChildren') === 'true');
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
      if (hostHasPartner) filters.hostHasPartner = true;
      if (hostHasFriends) filters.hostHasFriends = true;
      if (hostHasChildren) filters.hostHasChildren = true;

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
  }, [searchQuery, selectedType, selectedFestival, selectedCity, minPrice, maxPrice, sortBy, hostHasPartner, hostHasFriends, hostHasChildren]);

  // Keep ref in sync
  loadExperiencesRef.current = loadExperiences;

  // Initial load and filter changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
    }
    setPage(1);
    loadExperiencesRef.current?.(1, false);
  }, [selectedType, selectedFestival, selectedCity, minPrice, maxPrice, sortBy, hostHasPartner, hostHasFriends, hostHasChildren]);

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
  const activeFiltersCount = [selectedType, selectedFestival, selectedCity, minPrice, maxPrice, hostHasPartner, hostHasFriends, hostHasChildren].filter(Boolean).length;

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSelectedType('');
    setSelectedFestival('');
    setSelectedCity('');
    setMinPrice('');
    setMaxPrice('');
    setHostHasPartner(false);
    setHostHasFriends(false);
    setHostHasChildren(false);
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-display text-lg text-[#1A1410] flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-primary">
                    <path fillRule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 0 1 .628.74v2.288a2.25 2.25 0 0 1-.659 1.59l-4.682 4.683a2.25 2.25 0 0 0-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 0 1 8 18.25v-5.757a2.25 2.25 0 0 0-.659-1.591L2.659 6.22A2.25 2.25 0 0 1 2 4.629V2.34a.75.75 0 0 1 .628-.74Z" clipRule="evenodd" />
                  </svg>
                  Filtros
                </h3>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-primary font-semibold hover:text-primary-dark transition-colors bg-primary/10 px-2.5 py-1 rounded-lg"
                  >
                    Limpiar ({activeFiltersCount})
                  </button>
                )}
              </div>

              <div className="p-5 space-y-6">
                {/* Type */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M3.5 2A1.5 1.5 0 0 0 2 3.5V5c0 .325.104.634.296.886l4.204 5.04V15.5a1.5 1.5 0 0 0 .704 1.272l2 1.25A1.5 1.5 0 0 0 11.5 16.75v-5.824l4.204-5.04A1.5 1.5 0 0 0 16 5V3.5A1.5 1.5 0 0 0 14.5 2h-11Z" clipRule="evenodd" />
                    </svg>
                    Tipo
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { value: '', label: 'Todas' },
                      { value: 'pago', label: 'De pago' },
                      { value: 'intercambio', label: 'Intercambio' },
                      { value: 'ambos', label: 'Flexible' },
                    ].map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setSelectedType(type.value)}
                        className={`py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedType === type.value
                            ? 'bg-primary text-white shadow-sm shadow-primary/30'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-100" />

                {/* Festividad */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Z" clipRule="evenodd" />
                    </svg>
                    Festividad
                  </label>
                  <select
                    value={selectedFestival}
                    onChange={(e) => setSelectedFestival(e.target.value)}
                    className="w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-colors"
                  >
                    <option value="">Todas las festividades</option>
                    {festivals.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                {/* City */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.274 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
                    </svg>
                    Ciudad
                  </label>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-colors"
                  >
                    <option value="">Todas las ciudades</option>
                    {cities.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div className="border-t border-gray-100" />

                {/* Price range */}
                <PriceRangeSlider
                  minValue={minPrice}
                  maxValue={maxPrice}
                  onMinChange={setMinPrice}
                  onMaxChange={setMaxPrice}
                />

                <div className="border-t border-gray-100" />

                {/* Companion filter */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
                    </svg>
                    Perfecto si vas con
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setHostHasPartner(!hostHasPartner)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                        hostHasPartner
                          ? 'bg-pink-100 text-pink-700 ring-1 ring-pink-300'
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="m9.653 16.915-.005-.003-.019-.01a20.759 20.759 0 0 1-1.162-.682 22.045 22.045 0 0 1-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 0 1 8-2.828A4.5 4.5 0 0 1 18 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 0 1-3.744 2.582l-.019.01-.005.003h-.002a.723.723 0 0 1-.692 0h-.002Z" />
                      </svg>
                      Pareja
                    </button>
                    <button
                      onClick={() => setHostHasFriends(!hostHasFriends)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                        hostHasFriends
                          ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z" />
                      </svg>
                      Amigos
                    </button>
                    <button
                      onClick={() => setHostHasChildren(!hostHasChildren)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                        hostHasChildren
                          ? 'bg-green-100 text-green-700 ring-1 ring-green-300'
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
                      </svg>
                      Hijos
                    </button>
                  </div>
                </div>

                <div className="border-t border-gray-100" />

                {/* Sort */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M2 3.75A.75.75 0 0 1 2.75 3h11.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 3.75ZM2 7.5a.75.75 0 0 1 .75-.75h7.508a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 7.5ZM14 7a.75.75 0 0 1 .75.75v6.59l1.95-2.1a.75.75 0 1 1 1.1 1.02l-3.25 3.5a.75.75 0 0 1-1.1 0l-3.25-3.5a.75.75 0 1 1 1.1-1.02l1.95 2.1V7.75A.75.75 0 0 1 14 7ZM2 11.25a.75.75 0 0 1 .75-.75h4.562a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
                    </svg>
                    Ordenar
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-colors"
                  >
                    <option value="newest">M&aacute;s recientes</option>
                    <option value="price_asc">Precio: menor a mayor</option>
                    <option value="price_desc">Precio: mayor a menor</option>
                    <option value="rating">Mejor valoradas</option>
                  </select>
                </div>
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
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M3.5 2A1.5 1.5 0 0 0 2 3.5V5c0 .325.104.634.296.886l4.204 5.04V15.5a1.5 1.5 0 0 0 .704 1.272l2 1.25A1.5 1.5 0 0 0 11.5 16.75v-5.824l4.204-5.04A1.5 1.5 0 0 0 16 5V3.5A1.5 1.5 0 0 0 14.5 2h-11Z" clipRule="evenodd" />
                </svg>
                Tipo
              </label>
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
                    className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                      selectedType === type.value
                        ? 'bg-primary text-white shadow-sm shadow-primary/30'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* Festividad */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Z" clipRule="evenodd" />
                </svg>
                Festividad
              </label>
              <select
                value={selectedFestival}
                onChange={(e) => setSelectedFestival(e.target.value)}
                className="w-full py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
              >
                <option value="">Todas las festividades</option>
                {festivals.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            {/* City */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.274 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
                </svg>
                Ciudad
              </label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
              >
                <option value="">Todas las ciudades</option>
                {cities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            <div className="border-t border-gray-100" />

            {/* Price range */}
            <PriceRangeSlider
              minValue={minPrice}
              maxValue={maxPrice}
              onMinChange={setMinPrice}
              onMaxChange={setMaxPrice}
            />

            <div className="border-t border-gray-100" />

            {/* Companion filter */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
                </svg>
                Perfecto si vas con
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setHostHasPartner(!hostHasPartner)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-all ${
                    hostHasPartner
                      ? 'bg-pink-100 text-pink-700 ring-1 ring-pink-300'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="m9.653 16.915-.005-.003-.019-.01a20.759 20.759 0 0 1-1.162-.682 22.045 22.045 0 0 1-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 0 1 8-2.828A4.5 4.5 0 0 1 18 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 0 1-3.744 2.582l-.019.01-.005.003h-.002a.723.723 0 0 1-.692 0h-.002Z" />
                  </svg>
                  Pareja
                </button>
                <button
                  onClick={() => setHostHasFriends(!hostHasFriends)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-all ${
                    hostHasFriends
                      ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z" />
                  </svg>
                  Amigos
                </button>
                <button
                  onClick={() => setHostHasChildren(!hostHasChildren)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-all ${
                    hostHasChildren
                      ? 'bg-green-100 text-green-700 ring-1 ring-green-300'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
                  </svg>
                  Hijos
                </button>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* Sort */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M2 3.75A.75.75 0 0 1 2.75 3h11.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 3.75ZM2 7.5a.75.75 0 0 1 .75-.75h7.508a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 7.5ZM14 7a.75.75 0 0 1 .75.75v6.59l1.95-2.1a.75.75 0 1 1 1.1 1.02l-3.25 3.5a.75.75 0 0 1-1.1 0l-3.25-3.5a.75.75 0 1 1 1.1-1.02l1.95 2.1V7.75A.75.75 0 0 1 14 7ZM2 11.25a.75.75 0 0 1 .75-.75h4.562a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
                </svg>
                Ordenar
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
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
