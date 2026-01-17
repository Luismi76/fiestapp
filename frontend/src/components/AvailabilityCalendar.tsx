'use client';

import { useState, useMemo } from 'react';

interface AvailabilityCalendarProps {
  selectedDates: Date[];
  onDatesChange: (dates: Date[]) => void;
  minDate?: Date;
  maxDate?: Date;
  mode?: 'select' | 'view';
  availableDates?: Date[];
  onDateClick?: (date: Date) => void;
}

const DAYS_ES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function AvailabilityCalendar({
  selectedDates,
  onDatesChange,
  minDate = new Date(),
  maxDate,
  mode = 'select',
  availableDates = [],
  onDateClick,
}: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Get calendar days for current month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // First day of month
    const firstDay = new Date(year, month, 1);
    // Last day of month
    const lastDay = new Date(year, month + 1, 0);

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
      days.push(new Date(year, month, day));
    }

    return days;
  }, [currentMonth]);

  const goToPrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const isDateSelected = (date: Date) => {
    return selectedDates.some(d =>
      d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate()
    );
  };

  const isDateAvailable = (date: Date) => {
    return availableDates.some(d =>
      d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate()
    );
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date < today) return true;
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;

    return false;
  };

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return;

    if (mode === 'view') {
      onDateClick?.(date);
      return;
    }

    // Toggle date selection
    if (isDateSelected(date)) {
      onDatesChange(selectedDates.filter(d =>
        d.getFullYear() !== date.getFullYear() ||
        d.getMonth() !== date.getMonth() ||
        d.getDate() !== date.getDate()
      ));
    } else {
      onDatesChange([...selectedDates, date]);
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();
  };

  // Check if we can go to previous month
  const canGoPrev = () => {
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const today = new Date();
    return prevMonth >= new Date(today.getFullYear(), today.getMonth(), 1);
  };

  return (
    <div className="bg-white rounded-xl p-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={goToPrevMonth}
          disabled={!canGoPrev()}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ←
        </button>
        <h3 className="font-semibold text-gray-900">
          {MONTHS_ES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <button
          type="button"
          onClick={goToNextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          →
        </button>
      </div>

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
          const selected = isDateSelected(date);
          const available = mode === 'view' && isDateAvailable(date);
          const today = isToday(date);

          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => handleDateClick(date)}
              disabled={disabled}
              className={`
                aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all
                ${disabled ? 'text-gray-300 cursor-not-allowed' : 'cursor-pointer'}
                ${today && !selected ? 'ring-2 ring-primary ring-inset' : ''}
                ${selected ? 'bg-primary text-white' : ''}
                ${available && !selected ? 'bg-green-100 text-green-700 hover:bg-green-200' : ''}
                ${!disabled && !selected && !available ? 'hover:bg-gray-100 text-gray-700' : ''}
              `}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

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
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-green-100" />
              <span>Disponible</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-gray-100" />
              <span>No disponible</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
