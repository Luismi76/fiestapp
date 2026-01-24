'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';
import { festivalsApi, FestivalByMonth, CalendarFestival } from '@/lib/api';
import { getUploadUrl } from '@/lib/utils';

// Iconos
const ChevronLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
  </svg>
);

const FilterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
  </svg>
);

const MapPinIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
  </svg>
);

export default function CalendarPage() {
  const [calendarData, setCalendarData] = useState<FestivalByMonth[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [regions, setRegions] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    region: '',
    type: '',
    city: '',
  });
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [selectedFestival, setSelectedFestival] = useState<CalendarFestival | null>(null);

  // Contar filtros activos
  const activeFiltersCount = [filters.region, filters.type, filters.city].filter(Boolean).length;

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    loadCalendar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, filters]);

  const loadFilters = async () => {
    try {
      const [regionsData, typesData, citiesData] = await Promise.all([
        festivalsApi.getRegions(),
        festivalsApi.getTypes(),
        festivalsApi.getCities(),
      ]);
      setRegions(regionsData);
      setTypes(typesData);
      setCities(citiesData);
    } catch (error) {
      console.error('Error loading filters:', error);
    }
  };

  const loadCalendar = async () => {
    try {
      setLoading(true);
      const data = await festivalsApi.getCalendar(year, {
        region: filters.region || undefined,
        type: filters.type || undefined,
        city: filters.city || undefined,
      });
      setCalendarData(data);
    } catch (error) {
      console.error('Error loading calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({ region: '', type: '', city: '' });
    setShowFiltersModal(false);
  };

  const openGoogleCalendar = async (festivalId: string) => {
    try {
      const { url } = await festivalsApi.getGoogleCalendarUrl(festivalId);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error getting Google Calendar URL:', error);
    }
  };

  const downloadIcal = (festivalId?: string) => {
    const url = festivalsApi.getICalUrl(festivalId, filters);
    window.open(url, '_blank');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getTypeColor = (type: string | null) => {
    switch (type) {
      case 'religioso':
        return 'bg-purple-100 text-purple-700';
      case 'tradicional':
        return 'bg-orange-100 text-orange-700';
      case 'gastronomico':
        return 'bg-green-100 text-green-700';
      case 'musical':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Total de festivales
  const totalFestivals = calendarData.reduce((acc, month) => acc + month.festivals.length, 0);

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-orange-500/10 via-primary/5 to-transparent py-6 px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-center mb-6">
              <span className="bg-gradient-to-r from-orange-500 to-primary bg-clip-text text-transparent">
                Calendario {year}
              </span>
            </h1>

            {/* Year Navigation */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setYear(year - 1)}
                className="p-3 bg-white rounded-full shadow-sm hover:shadow-md transition-all"
              >
                <ChevronLeftIcon />
              </button>
              <div className="flex gap-2">
                {[year - 1, year, year + 1].map((y) => (
                  <button
                    key={y}
                    onClick={() => setYear(y)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                      y === year
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setYear(year + 1)}
                className="p-3 bg-white rounded-full shadow-sm hover:shadow-md transition-all"
              >
                <ChevronRightIcon />
              </button>
            </div>
          </div>
        </section>

        {/* Barra de filtros */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
          <div className="px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Boton de filtros */}
              <button
                onClick={() => setShowFiltersModal(true)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                  activeFiltersCount > 0
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                <FilterIcon />
                <span>Filtros</span>
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold bg-white/20">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Contador */}
              <span className="text-sm text-gray-500">
                {totalFestivals} festival{totalFestivals !== 1 ? 'es' : ''}
              </span>
            </div>

            {/* Exportar */}
            <button
              onClick={() => downloadIcal()}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <CalendarIcon />
              <span className="hidden sm:inline">Exportar</span>
            </button>
          </div>

          {/* Chips de filtros activos */}
          {activeFiltersCount > 0 && (
            <div className="px-4 pb-2.5 flex gap-2 overflow-x-auto scrollbar-hide">
              {filters.region && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full whitespace-nowrap">
                  {filters.region}
                  <button onClick={() => setFilters({ ...filters, region: '' })} className="p-0.5">
                    <CloseIcon />
                  </button>
                </span>
              )}
              {filters.type && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full whitespace-nowrap">
                  {filters.type}
                  <button onClick={() => setFilters({ ...filters, type: '' })} className="p-0.5">
                    <CloseIcon />
                  </button>
                </span>
              )}
              {filters.city && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full whitespace-nowrap">
                  {filters.city}
                  <button onClick={() => setFilters({ ...filters, city: '' })} className="p-0.5">
                    <CloseIcon />
                  </button>
                </span>
              )}
              <button onClick={clearFilters} className="px-2.5 py-1 text-xs font-medium text-gray-500 whitespace-nowrap">
                Limpiar
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : calendarData.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarIcon />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Sin festivales</h2>
              <p className="text-gray-500 mb-4">No hay festivales con los filtros seleccionados</p>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-primary text-white rounded-full text-sm font-medium"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {calendarData.map((monthData) => (
                <div key={monthData.month} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {/* Month Header */}
                  <div className="px-4 py-3 bg-gradient-to-r from-primary/5 to-orange-500/5 flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-gray-900">{monthData.monthName}</h2>
                      <p className="text-xs text-gray-500">{monthData.festivals.length} festival{monthData.festivals.length !== 1 ? 'es' : ''}</p>
                    </div>
                    <span className="text-2xl">
                      {monthData.month === 1 && '❄️'}
                      {monthData.month === 2 && '🎭'}
                      {monthData.month === 3 && '🌸'}
                      {monthData.month === 4 && '🐣'}
                      {monthData.month === 5 && '🌺'}
                      {monthData.month === 6 && '☀️'}
                      {monthData.month === 7 && '🎆'}
                      {monthData.month === 8 && '🏖️'}
                      {monthData.month === 9 && '🍇'}
                      {monthData.month === 10 && '🎃'}
                      {monthData.month === 11 && '🍂'}
                      {monthData.month === 12 && '🎄'}
                    </span>
                  </div>

                  {/* Festivals */}
                  <div className="divide-y divide-gray-50">
                    {monthData.festivals.map((festival) => (
                      <button
                        key={festival.id}
                        className="w-full p-4 hover:bg-gray-50 transition-colors text-left"
                        onClick={() => setSelectedFestival(festival)}
                      >
                        <div className="flex items-center gap-3">
                          {/* Fecha */}
                          <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-orange-500/10 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                            {festival.startDate ? (
                              <>
                                <span className="text-lg font-bold text-primary leading-none">
                                  {new Date(festival.startDate).getDate()}
                                </span>
                                <span className="text-[10px] text-gray-500 uppercase">
                                  {new Date(festival.startDate).toLocaleDateString('es-ES', { month: 'short' })}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-gray-400">TBD</span>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{festival.name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <MapPinIcon />
                                {festival.city}
                              </span>
                              {festival.festivalType && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${getTypeColor(festival.festivalType)}`}>
                                  {festival.festivalType}
                                </span>
                              )}
                            </div>
                            {festival.experienceCount > 0 && (
                              <p className="text-xs text-primary font-medium mt-1">
                                {festival.experienceCount} experiencia{festival.experienceCount !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>

                          {/* Arrow */}
                          <ChevronRightIcon />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de filtros */}
        {showFiltersModal && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center md:justify-center animate-fade-in"
            onClick={() => setShowFiltersModal(false)}
          >
            <div
              className="w-full md:w-[400px] bg-white rounded-t-3xl md:rounded-2xl max-h-[80vh] overflow-hidden animate-slide-up md:animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle - solo en movil */}
              <div className="flex justify-center pt-3 pb-2 md:hidden">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Filtrar festivales</h3>
                <button onClick={() => setShowFiltersModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <CloseIcon />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Region</label>
                  <select
                    value={filters.region}
                    onChange={(e) => setFilters({ ...filters, region: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm"
                  >
                    <option value="">Todas las regiones</option>
                    {regions.map((region) => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Tipo</label>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm"
                  >
                    <option value="">Todos los tipos</option>
                    {types.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Ciudad</label>
                  <select
                    value={filters.city}
                    onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm"
                  >
                    <option value="">Todas las ciudades</option>
                    {cities.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 py-4 border-t border-gray-100 flex gap-3">
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-3 text-sm font-medium text-red-600"
                  >
                    Limpiar
                  </button>
                )}
                <button
                  onClick={() => setShowFiltersModal(false)}
                  className="flex-1 py-3 bg-primary text-white text-sm font-semibold rounded-xl"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Festival Detail Modal */}
        {selectedFestival && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center md:justify-center animate-fade-in"
            onClick={() => setSelectedFestival(null)}
          >
            <div
              className="bg-white rounded-t-3xl md:rounded-2xl w-full md:w-[480px] max-h-[85vh] overflow-hidden animate-slide-up md:animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle - solo en movil */}
              <div className="flex justify-center pt-3 pb-2 md:hidden">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              {/* Image/Header */}
              <div className="h-36 bg-gradient-to-br from-primary to-orange-500 relative">
                {selectedFestival.imageUrl && (
                  <img
                    src={getUploadUrl(selectedFestival.imageUrl)}
                    alt={selectedFestival.name}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <button
                  onClick={() => setSelectedFestival(null)}
                  className="absolute top-3 right-3 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors"
                >
                  <CloseIcon />
                </button>
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h2 className="text-xl font-bold">{selectedFestival.name}</h2>
                  <p className="text-sm opacity-90 flex items-center gap-1">
                    <MapPinIcon />
                    {selectedFestival.city}
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Date & Type */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-full">
                    <CalendarIcon />
                    <span className="text-sm font-medium">
                      {selectedFestival.startDate
                        ? `${formatDate(selectedFestival.startDate)}${selectedFestival.endDate ? ` - ${formatDate(selectedFestival.endDate)}` : ''}`
                        : 'Fecha por confirmar'
                      }
                    </span>
                  </div>
                  {selectedFestival.festivalType && (
                    <span className={`text-sm px-3 py-2 rounded-full ${getTypeColor(selectedFestival.festivalType)}`}>
                      {selectedFestival.festivalType}
                    </span>
                  )}
                </div>

                {/* Region */}
                {selectedFestival.region && (
                  <p className="text-sm text-gray-500">{selectedFestival.region}</p>
                )}

                {/* Experience Count */}
                {selectedFestival.experienceCount > 0 && (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-3 flex items-center gap-2">
                    <span className="text-lg">🎉</span>
                    <p className="text-sm text-green-700">
                      <span className="font-semibold">{selectedFestival.experienceCount}</span> experiencia{selectedFestival.experienceCount !== 1 ? 's' : ''} disponible{selectedFestival.experienceCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  <Link
                    href={`/experiences?festival=${selectedFestival.id}`}
                    className="block w-full py-3 bg-primary text-white text-center font-semibold rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    Ver experiencias
                  </Link>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openGoogleCalendar(selectedFestival.id)}
                      className="py-2.5 bg-gray-100 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Google
                    </button>
                    <button
                      onClick={() => downloadIcal(selectedFestival.id)}
                      className="py-2.5 bg-gray-100 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <CalendarIcon />
                      .ics
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
