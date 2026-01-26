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
  // Modo 'view': ver fechas disponibles y hacer clic en una
  // Modo 'range': seleccionar un rango de fechas (inicio y fin)
  mode?: 'select' | 'view' | 'range';

  // Para modo 'select': fechas seleccionadas individualmente
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
const MONTHS_ES_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
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
  // Normalizar minDate al inicio del día para evitar problemas con horas
  const minDate = useMemo(() => {
    const date = minDateProp || new Date();
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }, [minDateProp]);
  // Calcular si las fechas disponibles abarcan múltiples meses
  const { spansMultipleMonths, lastMonth } = useMemo(() => {
    if (availableDates.length === 0) {
      return { spansMultipleMonths: false, firstMonth: null, lastMonth: null };
    }

    const sorted = [...availableDates].sort((a, b) => a.getTime() - b.getTime());
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const firstMonthDate = new Date(first.getFullYear(), first.getMonth(), 1);
    const lastMonthDate = new Date(last.getFullYear(), last.getMonth(), 1);

    const spans = firstMonthDate.getTime() !== lastMonthDate.getTime();

    return {
      spansMultipleMonths: spans,
      firstMonth: firstMonthDate,
      lastMonth: lastMonthDate,
    };
  }, [availableDates]);

  const [currentMonth, setCurrentMonth] = useState(() => {
    // Prioridad: initialDate > primera fecha disponible > fecha actual
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

  // Para el modo range: tracking de si estamos seleccionando inicio o fin
  const [selectingEnd, setSelectingEnd] = useState(false);

  // Crear mapa de ocupación para acceso rápido
  const occupancyMap = useMemo(() => {
    const map: Record<string, DateOccupancy> = {};
    for (const occ of occupancy) {
      map[occ.date] = occ;
    }
    return map;
  }, [occupancy]);

  // Get calendar days for a specific month
  const getCalendarDays = (month: Date) => {
    const year = month.getFullYear();
    const m = month.getMonth();

    // First day of month
    const firstDay = new Date(year, m, 1);
    // Last day of month
    const lastDay = new Date(year, m + 1, 0);

    // Start from Monday (adjust if month starts on Sunday)
    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1; // Convert to Monday = 0

    const days: (Date | null)[] = [];

    // Add empty slots for days before first day
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    // Add all days of month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, m, day));
    }

    return days;
  };

  const calendarDays = useMemo(() => getCalendarDays(currentMonth), [currentMonth]);

  // Segundo mes (solo si las fechas abarcan múltiples meses)
  const secondMonth = useMemo(() => {
    if (!spansMultipleMonths) return null;
    return new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  }, [currentMonth, spansMultipleMonths]);

  const secondMonthDays = useMemo(() => {
    if (!secondMonth) return [];
    return getCalendarDays(secondMonth);
  }, [secondMonth]);

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

  const isDateSelected = (date: Date) => {
    return selectedDates.some(d => isSameDay(d, date));
  };

  const isDateAvailable = (date: Date) => {
    return availableDates.some(d => isSameDay(d, date));
  };

  const getDateOccupancy = (date: Date): DateOccupancy | null => {
    const dateStr = date.toISOString().split('T')[0];
    return occupancyMap[dateStr] || null;
  };

  const isDateFull = (date: Date): boolean => {
    const occ = getDateOccupancy(date);
    return occ?.status === 'full';
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Normalizar la fecha para comparar solo día/mes/año
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    if (normalizedDate < today) return true;
    if (minDate && normalizedDate < minDate) return true;
    if (maxDate) {
      const normalizedMaxDate = new Date(maxDate);
      normalizedMaxDate.setHours(23, 59, 59, 999);
      if (normalizedDate > normalizedMaxDate) return true;
    }

    // En modo view/range, fechas llenas no son clickeables
    if ((mode === 'view' || mode === 'range') && occupancy.length > 0) {
      if (isDateFull(date)) return true;
    }

    // En modo view/range, solo las fechas disponibles son clickeables
    if ((mode === 'view' || mode === 'range') && availableDates.length > 0) {
      return !isDateAvailable(date);
    }

    return false;
  };

  const isInRange = (date: Date) => {
    if (mode !== 'range' || !dateRange.start) return false;

    const end = dateRange.end || dateRange.start;
    const start = dateRange.start;

    return date >= start && date <= end;
  };

  const isRangeStart = (date: Date) => {
    return mode === 'range' && dateRange.start && isSameDay(date, dateRange.start);
  };

  const isRangeEnd = (date: Date) => {
    return mode === 'range' && dateRange.end && isSameDay(date, dateRange.end);
  };

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return;

    if (mode === 'view') {
      onDateClick?.(date);
      return;
    }

    if (mode === 'range') {
      if (!dateRange.start || (dateRange.start && dateRange.end)) {
        // Iniciar nueva selección
        onRangeChange?.({ start: date, end: null });
        setSelectingEnd(true);
      } else if (selectingEnd) {
        // Completar el rango
        if (date < dateRange.start) {
          // Si la fecha es anterior al inicio, intercambiar
          onRangeChange?.({ start: date, end: dateRange.start });
        } else {
          onRangeChange?.({ start: dateRange.start, end: date });
        }
        setSelectingEnd(false);
      }
      return;
    }

    // Modo select: toggle date selection
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

  // Check if we can go to previous month
  const canGoPrev = () => {
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const today = new Date();
    return prevMonth >= new Date(today.getFullYear(), today.getMonth(), 1);
  };

  // Check if we can go to next month (considering if showing 2 months)
  const canGoNext = () => {
    if (!lastMonth) return true;
    const nextMonth = spansMultipleMonths
      ? new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 2, 1)
      : new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    return nextMonth <= lastMonth;
  };

  // Calcular número de días del rango
  const rangeDays = useMemo(() => {
    if (mode !== 'range' || !dateRange.start || !dateRange.end) return 0;
    const diffTime = Math.abs(dateRange.end.getTime() - dateRange.start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [mode, dateRange]);

  // Obtener clase de estilo según ocupación
  const getOccupancyClass = (date: Date, available: boolean): string => {
    if (!available) return '';

    const occ = getDateOccupancy(date);
    if (!occ) {
      // Sin datos de ocupación, mostrar como disponible normal
      return 'bg-green-100 text-green-700 hover:bg-green-200';
    }

    switch (occ.status) {
      case 'available':
        return 'bg-green-100 text-green-700 hover:bg-green-200';
      case 'partial':
        return 'bg-amber-100 text-amber-700 hover:bg-amber-200';
      case 'full':
        return 'bg-red-100 text-red-400 cursor-not-allowed';
      default:
        return 'bg-green-100 text-green-700 hover:bg-green-200';
    }
  };

  // Renderizar un mes
  const renderMonth = (monthDate: Date, days: (Date | null)[], showHeader: boolean = true) => (
    <div className={spansMultipleMonths ? 'flex-1 min-w-0' : ''}>
      {showHeader && (
        <h3 className="font-semibold text-gray-900 text-center mb-2 text-sm">
          {spansMultipleMonths
            ? `${MONTHS_ES_SHORT[monthDate.getMonth()]} ${monthDate.getFullYear()}`
            : `${MONTHS_ES[monthDate.getMonth()]} ${monthDate.getFullYear()}`
          }
        </h3>
      )}

      {/* Days header */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAYS_ES.map(day => (
          <div key={`${monthDate.getTime()}-${day}`} className="text-center text-[10px] font-medium text-gray-500 py-0.5">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${monthDate.getTime()}-${index}`} className="aspect-square" />;
          }

          const disabled = isDateDisabled(date);
          const selected = mode === 'select' && isDateSelected(date);
          const available = (mode === 'view' || mode === 'range') && isDateAvailable(date);
          const today = isToday(date);
          const inRange = isInRange(date);
          const rangeStart = isRangeStart(date);
          const rangeEnd = isRangeEnd(date);
          const occ = getDateOccupancy(date);
          const isFull = occ?.status === 'full';

          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => handleDateClick(date)}
              disabled={disabled}
              title={occ ? `${occ.booked}/${occ.capacity} reservas` : undefined}
              className={`
                aspect-square flex flex-col items-center justify-center rounded-md text-xs font-medium transition-all relative
                ${disabled ? 'text-gray-300 cursor-not-allowed' : 'cursor-pointer'}
                ${today && !selected && !inRange ? 'ring-1 ring-primary ring-inset' : ''}
                ${selected ? 'bg-primary text-white' : ''}
                ${rangeStart || rangeEnd ? 'bg-primary text-white' : ''}
                ${inRange && !rangeStart && !rangeEnd ? 'bg-primary/20 text-primary' : ''}
                ${available && !selected && !inRange && !isFull ? getOccupancyClass(date, available) : ''}
                ${isFull && !inRange ? 'bg-red-100 text-red-400 cursor-not-allowed' : ''}
                ${!disabled && !selected && !available && !inRange ? 'hover:bg-gray-100 text-gray-700' : ''}
              `}
            >
              <span>{date.getDate()}</span>
              {/* Indicador de ocupación parcial */}
              {occ && occ.status === 'partial' && !inRange && !selected && (
                <span className="text-[8px] leading-none">
                  {occ.capacity - occ.booked}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl p-2">
      {/* Header con navegación */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={goToPrevMonth}
          disabled={!canGoPrev()}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ←
        </button>
        {!spansMultipleMonths && (
          <h3 className="font-semibold text-gray-900">
            {MONTHS_ES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
        )}
        {spansMultipleMonths && <div />}
        <button
          type="button"
          onClick={goToNextMonth}
          disabled={!canGoNext()}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          →
        </button>
      </div>

      {/* Calendarios - uno o dos meses */}
      {spansMultipleMonths && secondMonth ? (
        <div className="flex gap-2">
          {renderMonth(currentMonth, calendarDays, true)}
          {renderMonth(secondMonth, secondMonthDays, true)}
        </div>
      ) : (
        <>
          {/* Days header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS_ES.map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const disabled = isDateDisabled(date);
              const selected = mode === 'select' && isDateSelected(date);
              const available = (mode === 'view' || mode === 'range') && isDateAvailable(date);
              const today = isToday(date);
              const inRange = isInRange(date);
              const rangeStart = isRangeStart(date);
              const rangeEnd = isRangeEnd(date);
              const occ = getDateOccupancy(date);
              const isFull = occ?.status === 'full';

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => handleDateClick(date)}
                  disabled={disabled}
                  title={occ ? `${occ.booked}/${occ.capacity} reservas` : undefined}
                  className={`
                    aspect-square flex flex-col items-center justify-center rounded-lg text-sm font-medium transition-all relative
                    ${disabled ? 'text-gray-300 cursor-not-allowed' : 'cursor-pointer'}
                    ${today && !selected && !inRange ? 'ring-2 ring-primary ring-inset' : ''}
                    ${selected ? 'bg-primary text-white' : ''}
                    ${rangeStart || rangeEnd ? 'bg-primary text-white' : ''}
                    ${inRange && !rangeStart && !rangeEnd ? 'bg-primary/20 text-primary' : ''}
                    ${available && !selected && !inRange && !isFull ? getOccupancyClass(date, available) : ''}
                    ${isFull && !inRange ? 'bg-red-100 text-red-400 cursor-not-allowed' : ''}
                    ${!disabled && !selected && !available && !inRange ? 'hover:bg-gray-100 text-gray-700' : ''}
                  `}
                >
                  <span>{date.getDate()}</span>
                  {/* Indicador de ocupación parcial */}
                  {occ && occ.status === 'partial' && !inRange && !selected && (
                    <span className="text-[9px] leading-none">
                      {occ.capacity - occ.booked}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Legend */}
      {mode === 'select' && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-primary" />
              <span>Seleccionado</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded ring-2 ring-primary ring-inset" />
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
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-green-100" />
              <span>Disponible</span>
            </div>
            {occupancy.length > 0 && (
              <>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-amber-100" />
                  <span>Ocupado</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-red-100" />
                  <span>Completo</span>
                </div>
              </>
            )}
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-gray-100" />
              <span>No disponible</span>
            </div>
          </div>
        </div>
      )}

      {mode === 'range' && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-primary" />
              <span>Inicio/Fin</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-primary/20" />
              <span>En rango</span>
            </div>
            {occupancy.length > 0 ? (
              <>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-green-100" />
                  <span>Libre</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-amber-100" />
                  <span>Ocupado</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-red-100" />
                  <span>Completo</span>
                </div>
              </>
            ) : availableDates.length > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-green-100" />
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
