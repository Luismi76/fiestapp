'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { experiencesApi, matchesApi, GroupPriceResult } from '@/lib/api';
import { ExperienceDetail, DateOccupancy } from '@/types/experience';
import { useAuth } from '@/contexts/AuthContext';
import { getUploadUrl } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';
import MainLayout from '@/components/MainLayout';
import logger from '@/lib/logger';

// Helper to get dates
const getToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const getTomorrow = () => {
  const d = getToday();
  d.setDate(d.getDate() + 1);
  return d;
};

const getThisWeekend = () => {
  const today = getToday();
  const day = today.getDay();
  const daysUntilSaturday = day === 0 ? 6 : 6 - day;
  const saturday = new Date(today);
  saturday.setDate(today.getDate() + daysUntilSaturday);
  return saturday;
};

const formatDate = (date: Date | null) => {
  if (!date) return '';
  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

const isSameDay = (d1: Date, d2: Date) => {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
};

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { vibrate } = useHaptic();

  // State
  const [experience, setExperience] = useState<ExperienceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [participants, setParticipants] = useState(1);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [occupancy, setOccupancy] = useState<DateOccupancy[]>([]);
  const [priceResult, setPriceResult] = useState<GroupPriceResult | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);

  // Check auth
  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/experiences/${params.id}/book`);
    }
  }, [isAuthenticated, params.id, router]);

  // Check if user is the owner and redirect
  useEffect(() => {
    if (experience && user && experience.hostId === user.id) {
      router.replace(`/experiences/${params.id}`);
    }
  }, [experience, user, params.id, router]);

  // Load experience
  useEffect(() => {
    const fetchExperience = async () => {
      const id = params.id as string;
      try {
        const data = await experiencesApi.getById(id);
        setExperience(data);

        // Load occupancy
        try {
          const occupancyData = await experiencesApi.getOccupancy(id);
          setOccupancy(occupancyData.dates);
        } catch {
          logger.debug('Could not load occupancy');
        }

        // Check for pre-selected date from URL
        const dateParam = searchParams.get('date');
        if (dateParam) {
          const preSelectedDate = new Date(dateParam);
          if (!isNaN(preSelectedDate.getTime())) {
            setSelectedDate(preSelectedDate);
          }
        }
      } catch {
        setError('No se pudo cargar la experiencia');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) fetchExperience();
  }, [params.id, searchParams]);

  // Calculate price when participants change
  useEffect(() => {
    const calculatePrice = async () => {
      if (!experience || !experience.price || experience.price <= 0) {
        setPriceResult(null);
        return;
      }

      setPriceLoading(true);
      try {
        const result = await experiencesApi.calculatePrice(experience.id, participants);
        setPriceResult(result);
      } catch {
        // Fallback calculation
        setPriceResult({
          pricePerPerson: experience.price,
          totalPrice: experience.price * participants,
          discount: 0,
          tier: 'individual',
          originalPricePerPerson: experience.price,
          savings: 0,
        });
      } finally {
        setPriceLoading(false);
      }
    };

    calculatePrice();
  }, [experience, participants]);

  // Available dates
  const availabilityDates = useMemo(() => {
    if (!experience?.availability || experience.availability.length === 0) return [];
    return experience.availability.map((d: Date | string) =>
      d instanceof Date ? d : new Date(d)
    ).filter((d: Date) => !isNaN(d.getTime()) && d >= getToday());
  }, [experience?.availability]);

  // Quick date options
  const quickDates = useMemo(() => {
    const today = getToday();
    const tomorrow = getTomorrow();
    const weekend = getThisWeekend();

    const isAvailable = (date: Date) => {
      if (availabilityDates.length === 0) return true;
      return availabilityDates.some(d => isSameDay(d, date));
    };

    const isNotFull = (date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      const occ = occupancy.find(o => o.date === dateStr);
      return !occ || occ.status !== 'full';
    };

    return [
      { label: 'Hoy', date: today, available: isAvailable(today) && isNotFull(today) },
      { label: 'Mañana', date: tomorrow, available: isAvailable(tomorrow) && isNotFull(tomorrow) },
      { label: 'Este finde', date: weekend, available: isAvailable(weekend) && isNotFull(weekend) },
    ];
  }, [availabilityDates, occupancy]);

  // Handlers
  const handleQuickDateSelect = useCallback((date: Date, available: boolean) => {
    if (!available) return;
    vibrate('light');
    setSelectedDate(date);
    setShowCalendar(false);
  }, [vibrate]);

  const handleParticipantChange = useCallback((delta: number) => {
    const minP = experience?.minParticipants || 1;
    const maxP = experience?.maxParticipants || experience?.capacity || 10;
    const newValue = Math.max(minP, Math.min(maxP, participants + delta));
    if (newValue !== participants) {
      vibrate('light');
      setParticipants(newValue);
    }
  }, [experience, participants, vibrate]);

  const handleSubmit = async () => {
    if (!experience) return;

    // Prevent owner from booking their own experience
    if (user && experience.hostId === user.id) {
      setSubmitError('No puedes reservar tu propia experiencia');
      return;
    }

    vibrate('medium');
    setSubmitting(true);
    setSubmitError('');

    try {
      // Formatear fecha como YYYY-MM-DD para evitar problemas de zona horaria
      let formattedDate: string | undefined;
      if (selectedDate) {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        formattedDate = `${year}-${month}-${day}`;
      }

      const match = await matchesApi.create({
        experienceId: experience.id,
        message: message.trim() || undefined,
        startDate: formattedDate,
        participants: participants > 1 ? participants : undefined,
      });

      vibrate('success');
      router.push(`/matches/${match.id}`);
    } catch (err: unknown) {
      vibrate('error');
      const error = err as { response?: { data?: { message?: string } } };
      setSubmitError(error.response?.data?.message || 'No se pudo enviar la solicitud.');
    } finally {
      setSubmitting(false);
    }
  };

  // Image helper
  const getImageUrl = (photo: string) => photo.startsWith('/images/') ? photo : getUploadUrl(photo);

  // Loading state
  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center bg-[var(--surface-warm)]">
          <div className="text-center">
            <div className="spinner spinner-lg mx-auto mb-4" />
            <p className="text-[#8B7355]">Cargando...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Error state
  if (error || !experience) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-[var(--surface-warm)]">
          <header className="mobile-header">
            <button onClick={() => router.back()} className="touch-target">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <span className="mobile-header-title">Error</span>
            <div className="w-11" />
          </header>
          <div className="flex flex-col items-center justify-center px-6 py-16">
            <div className="text-6xl mb-4">😕</div>
            <h2 className="text-xl font-bold mb-2">Experiencia no encontrada</h2>
            <p className="text-[#8B7355] mb-6">{error}</p>
            <Link href="/experiences" className="btn btn-primary">Ver experiencias</Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Owner cannot book their own experience
  const isOwner = user && experience.hostId === user.id;
  if (isOwner) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-[var(--surface-warm)]">
          <header className="mobile-header">
            <button onClick={() => router.back()} className="touch-target">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <span className="mobile-header-title">No disponible</span>
            <div className="w-11" />
          </header>
          <div className="flex flex-col items-center justify-center px-6 py-16">
            <div className="text-6xl mb-4">🙅</div>
            <h2 className="text-xl font-bold mb-2">Es tu experiencia</h2>
            <p className="text-[#8B7355] mb-6 text-center">No puedes reservar tu propia experiencia</p>
            <Link href={`/experiences/${experience.id}`} className="btn btn-primary">Ver experiencia</Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const isPaid = experience.type === 'pago' || experience.type === 'ambos';
  const totalPrice = priceResult?.totalPrice || (experience.price ? experience.price * participants : 0);

  return (
    <MainLayout>
    <div className="min-h-screen bg-[var(--surface-warm)] pb-32">
      {/* Header */}
      <header className="mobile-header">
        <div className="max-w-2xl mx-auto flex items-center justify-between w-full">
          <button onClick={() => router.back()} className="touch-target" aria-label="Volver">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="mobile-header-title">Reservar</span>
          <div className="w-11" />
        </div>
      </header>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Experience summary card */}
        <div className="card p-4">
          <div className="flex gap-3">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-[var(--surface-tile)] flex-shrink-0">
              {experience.photos?.[0] ? (
                <img
                  src={getImageUrl(experience.photos[0])}
                  alt={experience.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">🎉</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-[#1A1410] line-clamp-2">{experience.title}</h1>
              <div className="flex items-center gap-1 mt-1 text-sm text-[#8B7355]">
                {experience.avgRating && (
                  <>
                    <span className="text-[#E6A817]">★</span>
                    <span className="font-medium text-[#1A1410]">{experience.avgRating.toFixed(1)}</span>
                    <span className="mx-1">·</span>
                  </>
                )}
                <span>{experience.city}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Date selection */}
        <div className="card p-4">
          <h2 className="font-semibold text-[#1A1410] mb-3 flex items-center gap-2">
            <span className="text-lg">📅</span> Fecha
          </h2>

          {/* Quick date buttons */}
          <div className="flex gap-2 mb-3">
            {quickDates.map((qd) => (
              <button
                key={qd.label}
                onClick={() => handleQuickDateSelect(qd.date, qd.available)}
                disabled={!qd.available}
                className={`flex-1 py-3 px-3 rounded-xl text-sm font-semibold transition-all ripple ${
                  selectedDate && isSameDay(selectedDate, qd.date)
                    ? 'gradient-sunset text-white shadow-md'
                    : qd.available
                      ? 'bg-white text-[#1A1410] border border-[rgba(139,115,85,0.15)] hover:border-primary/30'
                      : 'bg-[var(--surface-tile)] text-[#A89880] cursor-not-allowed'
                }`}
              >
                {qd.label}
              </button>
            ))}
          </div>

          {/* Calendar toggle */}
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="w-full py-3 px-4 bg-[var(--surface-tile)] rounded-xl text-sm font-medium text-[#1A1410] flex items-center justify-between ripple ripple-dark"
          >
            <span className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[#8B7355]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              {selectedDate ? formatDate(selectedDate) : 'Elegir otra fecha'}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className={`w-4 h-4 text-[#8B7355] transition-transform ${showCalendar ? 'rotate-180' : ''}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {/* Inline calendar */}
          {showCalendar && availabilityDates.length > 0 && (
            <div className="mt-3 border border-[rgba(139,115,85,0.15)] rounded-xl overflow-hidden animate-fade-in">
              <div className="p-3 bg-white">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-[#A89880] py-1">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {availabilityDates.slice(0, 28).map((date) => {
                    const dateStr = date.toISOString().split('T')[0];
                    const occ = occupancy.find(o => o.date === dateStr);
                    const isFull = occ?.status === 'full';
                    const isSelected = selectedDate && isSameDay(selectedDate, date);

                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => {
                          if (!isFull) {
                            vibrate('light');
                            setSelectedDate(date);
                            setShowCalendar(false);
                          }
                        }}
                        disabled={isFull}
                        className={`
                          aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all min-h-[44px]
                          ${isSelected ? 'bg-primary text-white' : ''}
                          ${isFull ? 'bg-red-100 text-red-400 cursor-not-allowed' : ''}
                          ${!isSelected && !isFull ? 'bg-green-100 text-green-700 hover:bg-green-200' : ''}
                        `}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Participants selection */}
        <div className="card p-4">
          <h2 className="font-semibold text-[#1A1410] mb-3 flex items-center gap-2">
            <span className="text-lg">👥</span> Participantes
          </h2>

          <div className="flex items-center justify-between">
            <div className="text-sm text-[#8B7355]">
              {experience.minParticipants === experience.maxParticipants
                ? `${experience.minParticipants} persona${experience.minParticipants !== 1 ? 's' : ''}`
                : `De ${experience.minParticipants || 1} a ${experience.maxParticipants || experience.capacity || 10} personas`
              }
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => handleParticipantChange(-1)}
                disabled={participants <= (experience.minParticipants || 1)}
                className="w-11 h-11 rounded-full border-2 border-[rgba(139,115,85,0.2)] flex items-center justify-center text-[#8B7355] hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors ripple ripple-dark"
                aria-label="Reducir participantes"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                </svg>
              </button>

              <span className="text-2xl font-bold text-[#1A1410] w-8 text-center">
                {participants}
              </span>

              <button
                onClick={() => handleParticipantChange(1)}
                disabled={participants >= (experience.maxParticipants || experience.capacity || 10)}
                className="w-11 h-11 rounded-full border-2 border-[rgba(139,115,85,0.2)] flex items-center justify-center text-[#8B7355] hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors ripple ripple-dark"
                aria-label="Aumentar participantes"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Group discount indicator */}
          {priceResult && priceResult.discount > 0 && (
            <div className="mt-3 flex items-center gap-2 bg-emerald/10 text-emerald p-3 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">
                -{priceResult.discount}% descuento de grupo · Ahorras {priceResult.savings.toFixed(2)}€
              </span>
            </div>
          )}
        </div>

        {/* Message (optional) */}
        <div className="card p-4">
          <h2 className="font-semibold text-[#1A1410] mb-3 flex items-center gap-2">
            <span className="text-lg">💬</span> Mensaje <span className="text-[#A89880] font-normal text-sm">(opcional)</span>
          </h2>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Preséntate brevemente al anfitrión..."
            rows={3}
            className="input resize-none"
          />
        </div>

        {/* Error message */}
        {submitError && (
          <div className="bg-[var(--color-error-bg)] text-primary p-4 rounded-xl text-sm animate-fade-in">
            {submitError}
          </div>
        )}
      </div>

      {/* Fixed bottom bar with price and CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[rgba(139,115,85,0.15)] p-4 z-40 md:static md:border-t-0 md:py-6">
        <div className="flex items-center gap-4 max-w-2xl mx-auto">
          {/* Price summary */}
          <div className="flex-shrink-0">
            {isPaid && experience.price ? (
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-[#1A1410]">
                    {priceLoading ? (
                      <span className="inline-block w-16 h-7 skeleton rounded" />
                    ) : (
                      `${totalPrice.toFixed(0)}€`
                    )}
                  </span>
                </div>
                <p className="text-xs text-[#8B7355]">
                  {participants} persona{participants !== 1 ? 's' : ''} × {priceResult?.pricePerPerson?.toFixed(2) || experience.price}€
                </p>
              </div>
            ) : (
              <div>
                <span className="text-xl font-bold text-emerald">Intercambio</span>
                <p className="text-xs text-[#8B7355]">Sin coste</p>
              </div>
            )}
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 btn btn-primary py-4 text-base ripple"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <div className="spinner spinner-sm" />
                Enviando...
              </span>
            ) : (
              <>
                {isPaid ? `Enviar solicitud (${totalPrice.toFixed(0)}€)` : 'Proponer intercambio'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
    </MainLayout>
  );
}
