'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { festivalsApi, FestivalByMonth, CalendarFestival } from '@/lib/api';
import { getUploadUrl } from '@/lib/utils';

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
  const [selectedFestival, setSelectedFestival] = useState<CalendarFestival | null>(null);

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    loadCalendar();
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

  const handlePreviousYear = () => setYear(year - 1);
  const handleNextYear = () => setYear(year + 1);

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

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">Calendario de Festivales</h1>
          <p className="text-sm text-gray-500 mt-1">
            Descubre todas las fiestas de Espana
          </p>
        </div>

        {/* Year Navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <button
            onClick={handlePreviousYear}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="text-lg font-semibold text-gray-900">{year}</span>
          <button
            onClick={handleNextYear}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 px-4 py-3 overflow-x-auto border-t border-gray-100">
          <select
            value={filters.region}
            onChange={(e) => setFilters({ ...filters, region: e.target.value })}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
          >
            <option value="">Todas las regiones</option>
            {regions.map((region) => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>

          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
          >
            <option value="">Todos los tipos</option>
            {types.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
          >
            <option value="">Todas las ciudades</option>
            {cities.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        {/* Export Buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => downloadIcal()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Descargar .ics
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : calendarData.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Sin festivales</h2>
            <p className="text-gray-500">
              No hay festivales con los filtros seleccionados
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {calendarData.map((monthData) => (
              <div key={monthData.month} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Month Header */}
                <div className="px-4 py-3 bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900">{monthData.monthName}</h2>
                  <p className="text-xs text-gray-500">{monthData.festivals.length} festivales</p>
                </div>

                {/* Festivals */}
                <div className="divide-y divide-gray-100">
                  {monthData.festivals.map((festival) => (
                    <div
                      key={festival.id}
                      className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedFestival(festival)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Fecha */}
                        <div className="flex-shrink-0 text-center w-12">
                          {festival.startDate ? (
                            <>
                              <div className="text-lg font-bold text-primary">
                                {new Date(festival.startDate).getDate()}
                              </div>
                              <div className="text-xs text-gray-500 uppercase">
                                {new Date(festival.startDate).toLocaleDateString('es-ES', { month: 'short' })}
                              </div>
                            </>
                          ) : (
                            <div className="text-sm text-gray-400">TBD</div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{festival.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">{festival.city}</span>
                            {festival.festivalType && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(festival.festivalType)}`}>
                                {festival.festivalType}
                              </span>
                            )}
                          </div>
                          {festival.experienceCount > 0 && (
                            <p className="text-xs text-primary mt-1">
                              {festival.experienceCount} experiencias disponibles
                            </p>
                          )}
                        </div>

                        {/* Arrow */}
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Festival Detail Modal */}
      {selectedFestival && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          onClick={() => setSelectedFestival(null)}
        >
          <div
            className="bg-white rounded-t-3xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Image */}
            <div className="h-40 bg-gradient-to-r from-primary to-secondary relative">
              {selectedFestival.imageUrl && (
                <img
                  src={getUploadUrl(selectedFestival.imageUrl)}
                  alt={selectedFestival.name}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <h2 className="text-xl font-bold">{selectedFestival.name}</h2>
                <p className="text-sm opacity-90">{selectedFestival.city}</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Date */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedFestival.startDate
                      ? `${formatDate(selectedFestival.startDate)}${selectedFestival.endDate ? ` - ${formatDate(selectedFestival.endDate)}` : ''}`
                      : 'Fecha por confirmar'
                    }
                  </p>
                  {selectedFestival.region && (
                    <p className="text-xs text-gray-500">{selectedFestival.region}</p>
                  )}
                </div>
              </div>

              {/* Type Badge */}
              {selectedFestival.festivalType && (
                <div className="flex items-center gap-2">
                  <span className={`text-sm px-3 py-1 rounded-full ${getTypeColor(selectedFestival.festivalType)}`}>
                    {selectedFestival.festivalType}
                  </span>
                </div>
              )}

              {/* Experience Count */}
              {selectedFestival.experienceCount > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-sm text-green-700">
                    <span className="font-semibold">{selectedFestival.experienceCount}</span> experiencias disponibles
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
                    className="py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
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
                    className="py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    .ics
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
