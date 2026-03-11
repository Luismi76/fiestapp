'use client';

import { useState, useMemo } from 'react';

interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface DateOccupancy {
  date: string;
  booked: number;
  capacity: number;
  status: 'available' | 'partial' | 'full';
}

interface AvailabilityCalendarProps {
  // Modo 'select': seleccionar múltiples fechas individuales (para configurar disponibilidad)
  // Modo 'view': ver fechas disponibles (solo lectura o con onDateClick)
  // Modo 'range': seleccionar un rango de fechas (inicio y fin)
  mode?: 'select' | 'view' | 'range';

  // Para modo 'select' y 'view': fechas seleccionadas individualmente
  selectedDates?: Date[];
  onDatesChange?: (dates: Date[]) => void;

  // Para modo 'range': rango seleccionado
  dateRange?: DateRange;
  onRangeChange?: (range: DateRange) => void;

  // Para modo 'view': fechas disponibles para mostrar
  availableDates?: Date[];
  onDateClick?: (date: Date) => void;

  // Para modo 'view' y 'range': información de ocupación por fecha
  occupancy?: DateOccupancy[];

  // Restricciones
  minDate?: Date;
  maxDate?: Date;

  // Fecha inicial para centrar el calendario
  initialDate?: Date;
}

const DAYS_ES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function AvailabilityCalendar({
  mode = 'select',
  selectedDates = [],
  onDatesChange,
  dateRange = { start: null, end: null },
  onRangeChange,
  availableDates = [],
  onDateClick,
  occupancy = [],
  minDate: minDateProp,
  maxDate,
  initialDate,
}: AvailabilityCalendarProps) {
  const minDate = useMemo(() => {
    const date = minDateProp || new Date();
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }, [minDateProp]);

  const lastMonth = useMemo(() => {
    if (availableDates.length === 0) return null;
    const sorted = [...availableDates].sort((a, b) => a.getTime() - b.getTime());
    const last = sorted[sorted.length - 1];
    return new Date(last.getFullYear(), last.getMonth(), 1);
  }, [availableDates]);

  const [currentMonth, setCurrentMonth] = useState(() => {
    if (initialDate) {
      return new Date(initialDate.getFullYear(), initialDate.getMonth(), 1);
    }
    if (availableDates.length > 0) {
      const firstAvailable = availableDates.reduce((earliest, date) =>
        date < earliest ? date : earliest
      , availableDates[0]);
      return new Date(firstAvailable.getFullYear(), firstAvailable.getMonth(), 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectingEnd, setSelectingEnd] = useState(false);

  const occupancyMap = useMemo(() => {
    const map: Record<string, DateOccupancy> = {};
    for (const occ of occupancy) {
      map[occ.date] = occ;
    }
    return map;
  }, [occupancy]);

  const getCalendarDays = (month: Date) => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstDay = new Date(year, m, 1);
    const lastDay = new Date(year, m + 1, 0);

    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1;

    const days: (Date | null)[] = [];
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, m, day));
    }
    return days;
  };

  const calendarDays = useMemo(() => getCalendarDays(currentMonth), [currentMonth]);

  const goToPrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  };

  const isDateSelected = (date: Date) => selectedDates.some(d => isSameDay(d, date));
  const isDateAvailable = (date: Date) => availableDates.some(d => isSameDay(d, date));

  const getDateOccupancy = (date: Date): DateOccupancy | null => {
    const dateStr = date.toISOString().split('T')[0];
    return occupancyMap[dateStr] || null;
  };

  const isDateFull = (date: Date): boolean => getDateOccupancy(date)?.status === 'full';

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    if (normalizedDate < today) return true;
    if (minDate && normalizedDate < minDate) return true;
    if (maxDate) {
      const normalizedMaxDate = new Date(maxDate);
      normalizedMaxDate.setHours(23, 59, 59, 999);
      if (normalizedDate > normalizedMaxDate) return true;
    }

    if ((mode === 'view' || mode === 'range') && occupancy.length > 0) {
      if (isDateFull(date)) return true;
    }

    if ((mode === 'view' || mode === 'range') && availableDates.length > 0) {
      return !isDateAvailable(date);
    }

    return false;
  };

  const isInRange = (date: Date) => {
    if (mode !== 'range' || !dateRange.start) return false;
    const end = dateRange.end || dateRange.start;
    return date >= dateRange.start && date <= end;
  };

  const isRangeStart = (date: Date) => mode === 'range' && dateRange.start && isSameDay(date, dateRange.start);
  const isRangeEnd = (date: Date) => mode === 'range' && dateRange.end && isSameDay(date, dateRange.end);

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return;

    if (mode === 'view') {
      onDateClick?.(date);
      return;
    }

    if (mode === 'range') {
      if (!dateRange.start || (dateRange.start && dateRange.end)) {
        onRangeChange?.({ start: date, end: null });
        setSelectingEnd(true);
      } else if (selectingEnd) {
        if (date < dateRange.start) {
          onRangeChange?.({ start: date, end: dateRange.start });
        } else {
          onRangeChange?.({ start: dateRange.start, end: date });
        }
        setSelectingEnd(false);
      }
      return;
    }

    // Modo select: toggle
    if (isDateSelected(date)) {
      onDatesChange?.(selectedDates.filter(d => !isSameDay(d, date)));
    } else {
      onDatesChange?.([...selectedDates, date]);
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return isSameDay(date, today);
  };

  const canGoPrev = () => {
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const today = new Date();
    return prevMonth >= new Date(today.getFullYear(), today.getMonth(), 1);
  };

  const canGoNext = () => {
    if (!lastMonth) return true;
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    return nextMonth <= lastMonth;
  };

  const rangeDays = useMemo(() => {
    if (mode !== 'range' || !dateRange.start || !dateRange.end) return 0;
    const diffTime = Math.abs(dateRange.end.getTime() - dateRange.start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [mode, dateRange]);

  const getCellClass = (date: Date): string => {
    const disabled = isDateDisabled(date);
    const selected = (mode === 'select' || mode === 'view') && isDateSelected(date);
    const available = (mode === 'view' || mode === 'range') && isDateAvailable(date);
    const today = isToday(date);
    const inRange = isInRange(date);
    const rangeStart = isRangeStart(date);
    const rangeEnd = isRangeEnd(date);
    const occ = getDateOccupancy(date);
    const isFull = occ?.status === 'full';

    const classes: string[] = [
      'w-full h-10 flex flex-col items-center justify-center rounded-lg text-sm font-medium transition-all',
    ];

    if (disabled) {
      classes.push('text-gray-300 cursor-not-allowed');
    } else {
      classes.push('cursor-pointer');
    }

    if (today && !selected && !inRange && !rangeStart && !rangeEnd) {
      classes.push('ring-2 ring-primary ring-inset');
    }

    if (selected) {
      classes.push('bg-primary text-white');
    } else if (rangeStart || rangeEnd) {
      classes.push('bg-primary text-white');
    } else if (inRange) {
      classes.push('bg-primary/20 text-primary');
    } else if (isFull && !inRange) {
      classes.push('bg-red-100 text-red-400 cursor-not-allowed');
    } else if (available && !selected && !inRange) {
      const occData = getDateOccupancy(date);
      if (!occData || occData.status === 'available') {
        classes.push('bg-green-100 text-green-700 hover:bg-green-200');
      } else if (occData.status === 'partial') {
        classes.push('bg-amber-100 text-amber-700 hover:bg-amber-200');
      }
    } else if (!disabled && !selected && !available && !inRange) {
      classes.push('hover:bg-gray-100 text-gray-700');
    }

    return classes.join(' ');
  };

  return (
    <div className="bg-white rounded-xl p-3">
      {/* Header con navegación */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={goToPrevMonth}
          disabled={!canGoPrev()}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h3 className="font-semibold text-gray-900">
          {MONTHS_ES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <button
          type="button"
          onClick={goToNextMonth}
          disabled={!canGoNext()}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Days header */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_ES.map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-400 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid - siempre un solo mes, con flechas para navegar */}
      <div className="grid grid-cols-7 gap-y-1">
        {calendarDays.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="h-10" />;
          }

          const occ = getDateOccupancy(date);
          const selected = (mode === 'select' || mode === 'view') && isDateSelected(date);
          const inRange = isInRange(date);

          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => handleDateClick(date)}
              disabled={isDateDisabled(date)}
              title={occ ? `${occ.booked}/${occ.capacity} reservas` : undefined}
              className={getCellClass(date)}
            >
              <span>{date.getDate()}</span>
              {occ && occ.status === 'partial' && !inRange && !selected && (
                <span className="text-[9px] leading-none -mt-0.5">
                  {occ.capacity - occ.booked} libres
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      {mode === 'select' && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-primary" />
              <span>Seleccionado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded ring-2 ring-primary ring-inset" />
              <span>Hoy</span>
            </div>
          </div>
          {selectedDates.length > 0 && (
            <p className="mt-2 text-sm text-gray-600">
              {selectedDates.length} {selectedDates.length === 1 ? 'fecha seleccionada' : 'fechas seleccionadas'}
            </p>
          )}
        </div>
      )}

      {mode === 'view' && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            {selectedDates.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-primary" />
                <span>Seleccionado</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-100" />
              <span>Disponible</span>
            </div>
            {occupancy.length > 0 && (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-amber-100" />
                  <span>Quedan pocas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-red-100" />
                  <span>Completo</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {mode === 'range' && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-primary" />
              <span>Inicio/Fin</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-primary/20" />
              <span>En rango</span>
            </div>
            {occupancy.length > 0 ? (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-green-100" />
                  <span>Libre</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-amber-100" />
                  <span>Ocupado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-red-100" />
                  <span>Completo</span>
                </div>
              </>
            ) : availableDates.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-green-100" />
                <span>Disponible</span>
              </div>
            )}
          </div>
          {dateRange.start && (
            <div className="mt-2 text-sm text-gray-600">
              {dateRange.end ? (
                <span>
                  {dateRange.start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  {' → '}
                  {dateRange.end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  <span className="text-primary font-medium"> ({rangeDays} {rangeDays === 1 ? 'día' : 'días'})</span>
                </span>
              ) : (
                <span className="text-primary">Selecciona la fecha de fin</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
