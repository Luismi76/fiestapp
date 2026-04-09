'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';
import { festivalsApi, experiencesApi, FestivalByMonth, CalendarFestival, ExperienceByMonth, CalendarExperience } from '@/lib/api';
import { getUploadUrl } from '@/lib/utils';
import logger from '@/lib/logger';
import Image from 'next/image';

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

type ViewMode = 'festividades' | 'experiencias';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DAY_NAMES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// Helpers para el mini-calendario
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Lunes = 0
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function CalendarPage() {
  const [calendarData, setCalendarData] = useState<FestivalByMonth[]>([]);
  const [experiencesData, setExperiencesData] = useState<ExperienceByMonth[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('experiencias');

  // Mes seleccionado en el mini-calendario
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth()); // 0-11
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const [regions, setRegions] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [filters, setFilters] = useState({ region: '', type: '', city: '' });
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [selectedFestival, setSelectedFestival] = useState<CalendarFestival | null>(null);
  const [selectedExperience, setSelectedExperience] = useState<CalendarExperience | null>(null);

  const activeFiltersCount = viewMode === 'festividades'
    ? [filters.region, filters.type, filters.city].filter(Boolean).length
    : [filters.city].filter(Boolean).length;

  // Cargar filtros una vez
  useEffect(() => {
    Promise.all([
      festivalsApi.getRegions(),
      festivalsApi.getTypes(),
      festivalsApi.getCities(),
    ]).then(([r, t, c]) => { setRegions(r); setTypes(t); setCities(c); })
      .catch(err => logger.error('Error loading filters:', err));
  }, []);

  // Cargar datos al cambiar año o filtros
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (viewMode === 'festividades') {
          const data = await festivalsApi.getCalendar(currentYear, {
            region: filters.region || undefined,
            type: filters.type || undefined,
            city: filters.city || undefined,
          });
          setCalendarData(data);
        } else {
          const data = await experiencesApi.getCalendar(currentYear, {
            city: filters.city || undefined,
          });
          setExperiencesData(data);
        }
      } catch (err) {
        logger.error('Error loading calendar:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentYear, filters, viewMode]);

  // Resetear día seleccionado al cambiar mes/modo
  useEffect(() => {
    setSelectedDay(null);
  }, [currentMonth, currentYear, viewMode]);

  // Construir mapa de fechas con contenido para el mes actual
  const dayMarkers = useMemo(() => {
    const markers: Record<string, { festivals: number; experiences: number }> = {};

    if (viewMode === 'festividades') {
      const monthData = calendarData.find(m => m.month === currentMonth + 1);
      if (monthData) {
        for (const f of monthData.festivals) {
          if (f.startDate) {
            const start = new Date(f.startDate);
            const end = f.endDate ? new Date(f.endDate) : start;
            const d = new Date(start);
            while (d <= end) {
              if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                const key = dateKey(currentYear, currentMonth, d.getDate());
                if (!markers[key]) markers[key] = { festivals: 0, experiences: 0 };
                markers[key].festivals++;
              }
              d.setDate(d.getDate() + 1);
            }
          }
        }
      }
    } else {
      const monthData = experiencesData.find(m => m.month === currentMonth + 1);
      if (monthData) {
        for (const exp of monthData.experiences) {
          for (const ds of exp.dates) {
            const d = new Date(ds);
            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
              const key = dateKey(currentYear, currentMonth, d.getDate());
              if (!markers[key]) markers[key] = { festivals: 0, experiences: 0 };
              markers[key].experiences++;
            }
          }
        }
      }
    }

    return markers;
  }, [calendarData, experiencesData, currentMonth, currentYear, viewMode]);

  // Listado filtrado por día seleccionado
  const filteredFestivals = useMemo(() => {
    const monthData = calendarData.find(m => m.month === currentMonth + 1);
    if (!monthData) return [];
    if (selectedDay === null) return monthData.festivals;

    return monthData.festivals.filter(f => {
      if (!f.startDate) return false;
      const start = new Date(f.startDate);
      const end = f.endDate ? new Date(f.endDate) : start;
      const target = new Date(currentYear, currentMonth, selectedDay);
      return target >= start && target <= end;
    });
  }, [calendarData, currentMonth, currentYear, selectedDay]);

  const filteredExperiences = useMemo(() => {
    const monthData = experiencesData.find(m => m.month === currentMonth + 1);
    if (!monthData) return [];
    if (selectedDay === null) return monthData.experiences;

    const targetKey = dateKey(currentYear, currentMonth, selectedDay);
    return monthData.experiences.filter(exp =>
      exp.dates.some(ds => {
        const d = new Date(ds);
        return dateKey(d.getFullYear(), d.getMonth(), d.getDate()) === targetKey;
      })
    );
  }, [experiencesData, currentMonth, currentYear, selectedDay]);

  // Navegación de mes
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
    setSelectedDay(now.getDate());
  };

  const clearFilters = () => {
    setFilters({ region: '', type: '', city: '' });
    setShowFiltersModal(false);
  };

  const openGoogleCalendar = async (festivalId: string) => {
    try {
      const { url } = await festivalsApi.getGoogleCalendarUrl(festivalId);
      window.open(url, '_blank');
    } catch (err) {
      logger.error('Error getting Google Calendar URL:', err);
    }
  };

  const downloadIcal = (festivalId?: string) => {
    const url = festivalsApi.getICalUrl(festivalId, filters);
    window.open(url, '_blank');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const getTypeColor = (type: string | null) => {
    switch (type) {
      case 'religioso': return 'bg-purple-100 text-purple-700';
      case 'tradicional': return 'bg-orange-100 text-orange-700';
      case 'gastronomico': return 'bg-green-100 text-green-700';
      case 'musical': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getExperienceTypeLabel = (type: string) => {
    switch (type) {
      case 'pago': return 'Pago';
      case 'intercambio': return 'Intercambio';
      case 'ambos': return 'Pago / Intercambio';
      default: return type;
    }
  };

  const getExperienceTypeColor = (type: string) => {
    switch (type) {
      case 'pago': return 'bg-green-100 text-green-700';
      case 'intercambio': return 'bg-blue-100 text-blue-700';
      case 'ambos': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Datos del mini-calendario
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isToday = (day: number) =>
    day === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear();

  const isDayPast = (day: number) => {
    const d = new Date(currentYear, currentMonth, day);
    d.setHours(0, 0, 0, 0);
    return d < today;
  };

  const isFestivalPast = (festival: CalendarFestival) => {
    const endDate = festival.endDate || festival.startDate;
    if (!endDate) return false;
    return new Date(endDate) < today;
  };

  const isExperiencePast = (experience: CalendarExperience) => {
    if (experience.dates.length === 0) return false;
    const lastDate = experience.dates.reduce((latest, d) => d > latest ? d : latest, experience.dates[0]);
    return new Date(lastDate) < today;
  };

  const totalItems = viewMode === 'festividades' ? filteredFestivals.length : filteredExperiences.length;

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header con toggle */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-2xl mx-auto px-4 pt-4 pb-3">
            {/* Toggle */}
            <div className="flex justify-center mb-3">
              <div className="bg-gray-100 rounded-full p-1 inline-flex">
                <button
                  onClick={() => setViewMode('experiencias')}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                    viewMode === 'experiencias'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-gray-600'
                  }`}
                >
                  Experiencias
                </button>
                <button
                  onClick={() => setViewMode('festividades')}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                    viewMode === 'festividades'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-gray-600'
                  }`}
                >
                  Festividades
                </button>
              </div>
            </div>

            {/* Navegación de mes */}
            <div className="flex items-center justify-between">
              <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronLeftIcon />
              </button>
              <button onClick={goToToday} className="text-lg font-bold text-gray-900 hover:text-primary transition-colors">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </button>
              <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronRightIcon />
              </button>
            </div>

            {/* Mini-calendario */}
            <div className="mt-3">
              {/* Días de la semana */}
              <div className="grid grid-cols-7 mb-1">
                {DAY_NAMES.map(d => (
                  <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Días del mes */}
              <div className="grid grid-cols-7">
                {/* Espacios vacíos antes del primer día */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Días */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const key = dateKey(currentYear, currentMonth, day);
                  const marker = dayMarkers[key];
                  const selected = selectedDay === day;
                  const todayCell = isToday(day);
                  const past = isDayPast(day);

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(selected ? null : day)}
                      className={`aspect-square flex flex-col items-center justify-center rounded-full relative transition-all text-sm ${
                        selected
                          ? 'bg-primary text-white font-bold'
                          : todayCell
                            ? 'bg-primary/10 text-primary font-bold'
                            : past
                              ? 'text-gray-300'
                              : marker
                                ? 'text-gray-900 font-medium'
                                : 'text-gray-400'
                      }`}
                    >
                      {day}
                      {/* Puntos indicadores */}
                      {marker && !selected && (
                        <div className="absolute bottom-0.5 flex gap-0.5">
                          {marker.festivals > 0 && (
                            <span className="w-1 h-1 rounded-full bg-orange-500" />
                          )}
                          {marker.experiences > 0 && (
                            <span className="w-1 h-1 rounded-full bg-purple-500" />
                          )}
                        </div>
                      )}
                      {marker && selected && (
                        <div className="absolute bottom-0.5 flex gap-0.5">
                          <span className="w-1 h-1 rounded-full bg-white/70" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Barra de filtros y contador */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
          <div className="px-4 py-2.5 flex items-center justify-between max-w-2xl mx-auto">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFiltersModal(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeFiltersCount > 0 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'
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
              <span className="text-sm text-gray-500">
                {selectedDay
                  ? `${totalItems} el ${selectedDay} de ${MONTH_NAMES[currentMonth].toLowerCase()}`
                  : `${totalItems} en ${MONTH_NAMES[currentMonth].toLowerCase()}`
                }
              </span>
            </div>

            {viewMode === 'festividades' && (
              <button
                onClick={() => downloadIcal()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <CalendarIcon />
                <span className="hidden sm:inline">Exportar</span>
              </button>
            )}
          </div>

          {activeFiltersCount > 0 && (
            <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide max-w-2xl mx-auto">
              {filters.region && viewMode === 'festividades' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full whitespace-nowrap">
                  {filters.region}
                  <button onClick={() => setFilters({ ...filters, region: '' })} className="p-0.5"><CloseIcon /></button>
                </span>
              )}
              {filters.type && viewMode === 'festividades' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full whitespace-nowrap">
                  {filters.type}
                  <button onClick={() => setFilters({ ...filters, type: '' })} className="p-0.5"><CloseIcon /></button>
                </span>
              )}
              {filters.city && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full whitespace-nowrap">
                  {filters.city}
                  <button onClick={() => setFilters({ ...filters, city: '' })} className="p-0.5"><CloseIcon /></button>
                </span>
              )}
              <button onClick={clearFilters} className="px-2.5 py-1 text-xs font-medium text-gray-500 whitespace-nowrap">Limpiar</button>
            </div>
          )}
        </div>

        {/* Listado */}
        <div className="px-4 max-w-2xl mx-auto py-4 pb-24">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : totalItems === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CalendarIcon />
              </div>
              <p className="text-gray-500 text-sm">
                {selectedDay
                  ? `Sin ${viewMode === 'festividades' ? 'festividades' : 'experiencias'} el ${selectedDay} de ${MONTH_NAMES[currentMonth].toLowerCase()}`
                  : `Sin ${viewMode === 'festividades' ? 'festividades' : 'experiencias'} en ${MONTH_NAMES[currentMonth].toLowerCase()}`
                }
              </p>
              {selectedDay && (
                <button onClick={() => setSelectedDay(null)} className="mt-3 text-sm text-primary font-medium">
                  Ver todo el mes
                </button>
              )}
            </div>
          ) : viewMode === 'festividades' ? (
            /* =============== LISTA FESTIVIDADES =============== */
            <div className="space-y-2">
              {filteredFestivals.map((festival) => (
                <button
                  key={festival.id}
                  className={`w-full bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all text-left ${isFestivalPast(festival) ? 'opacity-40' : ''}`}
                  onClick={() => setSelectedFestival(festival)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-primary/10 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
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
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{festival.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPinIcon /> {festival.city}
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
                    <ChevronRightIcon />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            /* =============== LISTA EXPERIENCIAS =============== */
            <div className="space-y-2">
              {filteredExperiences.map((experience) => (
                <button
                  key={experience.id}
                  className={`w-full bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all text-left ${isExperiencePast(experience) ? 'opacity-40' : ''}`}
                  onClick={() => setSelectedExperience(experience)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                      {experience.photo ? (
                        <Image
                          src={getUploadUrl(experience.photo) || ''}
                          alt={experience.title}
                          width={48} height={48}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{experience.title}</h3>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPinIcon /> {experience.city}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${getExperienceTypeColor(experience.type)}`}>
                          {getExperienceTypeLabel(experience.type)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {experience.price != null && experience.type !== 'intercambio' && (
                          <span className="text-xs font-semibold text-gray-900">{experience.price}€</span>
                        )}
                        <span className="text-xs text-gray-400">
                          {experience.dates.length} fecha{experience.dates.length !== 1 ? 's' : ''}
                        </span>
                        {experience.festivalName && (
                          <span className="text-xs text-orange-600 truncate max-w-[120px]">{experience.festivalName}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRightIcon />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ========== MODALES ========== */}

        {/* Modal de filtros */}
        {showFiltersModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center md:justify-center animate-fade-in" onClick={() => setShowFiltersModal(false)}>
            <div className="w-full md:w-[400px] bg-white rounded-t-3xl md:rounded-2xl max-h-[80vh] overflow-hidden animate-slide-up md:animate-scale-in" onClick={e => e.stopPropagation()}>
              <div className="flex justify-center pt-3 pb-2 md:hidden"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold">{viewMode === 'festividades' ? 'Filtrar festividades' : 'Filtrar experiencias'}</h3>
                <button onClick={() => setShowFiltersModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><CloseIcon /></button>
              </div>
              <div className="p-4 space-y-4">
                {viewMode === 'festividades' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Region</label>
                      <select value={filters.region} onChange={e => setFilters({ ...filters, region: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm">
                        <option value="">Todas las regiones</option>
                        {regions.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Tipo</label>
                      <select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm">
                        <option value="">Todos los tipos</option>
                        {types.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Ciudad</label>
                  <select value={filters.city} onChange={e => setFilters({ ...filters, city: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm">
                    <option value="">Todas las ciudades</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="px-4 py-4 border-t border-gray-100 flex gap-3">
                {activeFiltersCount > 0 && <button onClick={clearFilters} className="px-4 py-3 text-sm font-medium text-red-600">Limpiar</button>}
                <button onClick={() => setShowFiltersModal(false)} className="flex-1 py-3 bg-primary text-white text-sm font-semibold rounded-xl">Aplicar</button>
              </div>
            </div>
          </div>
        )}

        {/* Festival Detail Modal */}
        {selectedFestival && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center md:justify-center animate-fade-in" onClick={() => setSelectedFestival(null)}>
            <div className="bg-white rounded-t-3xl md:rounded-2xl w-full md:w-[480px] max-h-[85vh] overflow-hidden animate-slide-up md:animate-scale-in" onClick={e => e.stopPropagation()}>
              <div className="flex justify-center pt-3 pb-2 md:hidden"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
              <div className="h-36 bg-gradient-to-br from-primary to-orange-500 relative">
                {selectedFestival.imageUrl && (
                  <Image src={getUploadUrl(selectedFestival.imageUrl) || ''} alt={selectedFestival.name} className="w-full h-full object-cover" fill unoptimized />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <button onClick={() => setSelectedFestival(null)} className="absolute top-3 right-3 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors"><CloseIcon /></button>
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h2 className="text-xl font-bold">{selectedFestival.name}</h2>
                  <p className="text-sm opacity-90 flex items-center gap-1"><MapPinIcon /> {selectedFestival.city}</p>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-full">
                    <CalendarIcon />
                    <span className="text-sm font-medium">
                      {selectedFestival.startDate
                        ? `${formatDate(selectedFestival.startDate)}${selectedFestival.endDate ? ` - ${formatDate(selectedFestival.endDate)}` : ''}`
                        : 'Fecha por confirmar'}
                    </span>
                  </div>
                  {selectedFestival.festivalType && (
                    <span className={`text-sm px-3 py-2 rounded-full ${getTypeColor(selectedFestival.festivalType)}`}>{selectedFestival.festivalType}</span>
                  )}
                </div>
                {selectedFestival.region && <p className="text-sm text-gray-500">{selectedFestival.region}</p>}
                {selectedFestival.experienceCount > 0 && (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-3 flex items-center gap-2">
                    <span className="text-lg">🎉</span>
                    <p className="text-sm text-green-700"><span className="font-semibold">{selectedFestival.experienceCount}</span> experiencia{selectedFestival.experienceCount !== 1 ? 's' : ''} disponible{selectedFestival.experienceCount !== 1 ? 's' : ''}</p>
                  </div>
                )}
                <div className="space-y-2 pt-2">
                  <Link href={`/experiences?festival=${selectedFestival.id}`} className="block w-full py-3 bg-primary text-white text-center font-semibold rounded-xl hover:bg-primary/90 transition-colors">Ver experiencias</Link>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => openGoogleCalendar(selectedFestival.id)} className="py-2.5 bg-gray-100 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                      Google
                    </button>
                    <button onClick={() => downloadIcal(selectedFestival.id)} className="py-2.5 bg-gray-100 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"><CalendarIcon /> .ics</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Experience Detail Modal */}
        {selectedExperience && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center md:justify-center animate-fade-in" onClick={() => setSelectedExperience(null)}>
            <div className="bg-white rounded-t-3xl md:rounded-2xl w-full md:w-[480px] max-h-[85vh] overflow-hidden animate-slide-up md:animate-scale-in" onClick={e => e.stopPropagation()}>
              <div className="flex justify-center pt-3 pb-2 md:hidden"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
              <div className="h-36 bg-gradient-to-br from-purple-500 to-primary relative">
                {selectedExperience.photo && (
                  <Image src={getUploadUrl(selectedExperience.photo) || ''} alt={selectedExperience.title} className="w-full h-full object-cover" fill unoptimized />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <button onClick={() => setSelectedExperience(null)} className="absolute top-3 right-3 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors"><CloseIcon /></button>
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h2 className="text-xl font-bold">{selectedExperience.title}</h2>
                  <p className="text-sm opacity-90 flex items-center gap-1"><MapPinIcon /> {selectedExperience.city}</p>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`text-sm px-3 py-2 rounded-full font-medium ${getExperienceTypeColor(selectedExperience.type)}`}>{getExperienceTypeLabel(selectedExperience.type)}</span>
                  {selectedExperience.price != null && selectedExperience.type !== 'intercambio' && (
                    <div className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-full">
                      <span className="text-sm font-bold text-gray-900">{selectedExperience.price}€</span>
                      <span className="text-xs text-gray-500">/ persona</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                    {selectedExperience.hostAvatar ? (
                      <Image src={getUploadUrl(selectedExperience.hostAvatar) || ''} alt={selectedExperience.hostName} width={32} height={32} className="w-full h-full object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">{selectedExperience.hostName.charAt(0)}</div>
                    )}
                  </div>
                  <span className="text-sm text-gray-700">por <span className="font-medium">{selectedExperience.hostName}</span></span>
                </div>
                {selectedExperience.festivalName && (
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 flex items-center gap-2">
                    <span className="text-lg">🎪</span>
                    <p className="text-sm text-orange-700">{selectedExperience.festivalName}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Fechas disponibles</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedExperience.dates.map((date, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-200">
                        {new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="pt-2">
                  <Link href={`/experiences/${selectedExperience.id}`} className="block w-full py-3 bg-primary text-white text-center font-semibold rounded-xl hover:bg-primary/90 transition-colors">Ver experiencia</Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
