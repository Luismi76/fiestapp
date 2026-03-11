'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { experiencesApi, matchesApi, favoritesApi } from '@/lib/api';
import { ExperienceDetail, DateOccupancy } from '@/types/experience';
import { useAuth } from '@/contexts/AuthContext';
import { getAvatarUrl, getUploadUrl } from '@/lib/utils';
import ShareButton from '@/components/ShareButton';
import ReportButton from '@/components/ReportButton';
import ParticipantSelector from '@/components/ParticipantSelector';
import MainLayout from '@/components/MainLayout';
import logger from '@/lib/logger';
import { useToast } from '@/components/ui/Toast';
import Image from 'next/image';

const ImageGallery = dynamic(() => import('@/components/ImageGallery'));
const AvailabilityCalendar = dynamic(() => import('@/components/AvailabilityCalendar'));


export default function ExperienceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [experience, setExperience] = useState<ExperienceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState('');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [occupancy, setOccupancy] = useState<DateOccupancy[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [participants, setParticipants] = useState(1);
  const [participantNames, setParticipantNames] = useState<string[]>([]);

  useEffect(() => {
    const fetchExperience = async () => {
      const id = params.id as string;
      try {
        const [data, occupancyResult] = await Promise.allSettled([
          experiencesApi.getById(id),
          experiencesApi.getOccupancy(id),
        ]);

        if (data.status === 'rejected') throw data.reason;

        setExperience(data.value);

        if (occupancyResult.status === 'fulfilled') {
          setOccupancy(occupancyResult.value.dates);
        } else {
          logger.debug('No se pudo cargar la ocupación');
        }
      } catch {
        setError('No se pudo cargar la experiencia');
      } finally {
        setLoading(false);
      }
    };
    if (params.id) fetchExperience();
  }, [params.id]);

  // Verificar si es favorito cuando el usuario esta autenticado
  useEffect(() => {
    const checkFavorite = async () => {
      if (!isAuthenticated || !params.id) return;
      try {
        const result = await favoritesApi.isFavorite(params.id as string);
        setIsFavorite(result.isFavorite);
      } catch {
        // Si falla, asumimos que no es favorito
      }
    };
    checkFavorite();
  }, [isAuthenticated, params.id]);

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!params.id || favoriteLoading) return;

    setFavoriteLoading(true);
    try {
      await favoritesApi.toggleFavorite(params.id as string, isFavorite);
      setIsFavorite(!isFavorite);
      toast.success(!isFavorite ? 'Añadido a favoritos' : 'Eliminado de favoritos');
    } catch (error) {
      logger.error('Error toggling favorite:', error);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleParticipantsChange = useCallback((count: number) => {
    setParticipants(count);
  }, []);

  const handleSubmitRequest = async () => {
    if (!experience) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const match = await matchesApi.create({
        experienceId: experience.id,
        message: message.trim() || undefined,
        startDate: dateRange.start ? dateRange.start.toISOString() : undefined,
        endDate: dateRange.end ? dateRange.end.toISOString() : undefined,
        participants: participants > 1 ? participants : undefined,
        participantNames: participantNames.filter(n => n.trim()).length > 0
          ? participantNames.filter(n => n.trim())
          : undefined,
      });
      setShowModal(false);
      router.push(`/matches/${match.id}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setSubmitError(error.response?.data?.message || 'No se pudo enviar la solicitud.');
    } finally {
      setSubmitting(false);
    }
  };

  const getImageUrl = (photo: string) => photo.startsWith('/images/') ? photo : getUploadUrl(photo);
  const getHostAvatar = (avatar?: string) => {
    if (!avatar) return null;
    return avatar.startsWith('/images/') ? avatar : getAvatarUrl(avatar);
  };

  const formatParticipants = (count: number) => {
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toString();
  };

  const availabilityDates = useMemo(() => {
    if (!experience?.availability || experience.availability.length === 0) return [];
    return experience.availability.map((d: Date | string) =>
      d instanceof Date ? d : new Date(d)
    ).filter((d: Date) => !isNaN(d.getTime()));
  }, [experience?.availability]);

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="spinner spinner-lg mx-auto mb-4" />
            <p className="text-gray-500">Cargando experiencia...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !experience) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-white">
          <header className="mobile-header">
            <button onClick={() => router.back()} className="text-2xl">←</button>
            <span className="mobile-header-title">Error</span>
            <div className="w-6" />
          </header>
          <div className="flex flex-col items-center justify-center px-6 py-16">
            <div className="text-6xl mb-4">😕</div>
            <h2 className="text-xl font-bold mb-2">Experiencia no encontrada</h2>
            <p className="text-gray-500 mb-6">{error}</p>
            <Link href="/dashboard" className="btn btn-primary">Volver al inicio</Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const isOwner = user?.id === experience.hostId;
  const highlights = experience.highlights || [];
  const hashtags = experience.festival ? ['#' + experience.festival.name.replace(/\s/g, '')] : [];

  return (
    <MainLayout>
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Desktop: 2-column layout */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:max-w-7xl lg:mx-auto lg:px-8 lg:py-8">
        {/* Left column: Image gallery - sticky on desktop */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          {/* Hero Image with Gallery */}
          <div className="relative group lg:rounded-2xl lg:overflow-hidden lg:shadow-lg">
            <div className="max-h-[70vh] lg:max-h-[80vh] overflow-hidden">
              <ImageGallery
                images={experience.photos && experience.photos.length > 0
                  ? experience.photos.map(getImageUrl).filter((url): url is string => url !== undefined)
                  : []}
                alt={experience.title}
                aspectRatio="aspect-[3/4] lg:aspect-[4/5]"
                showDots={false}
                showCounter={false}
              />
              {/* Gradient overlay for text readability - only on mobile */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent pointer-events-none lg:hidden" />
            </div>

            {/* Header buttons - mobile only */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-6 z-10 lg:hidden">
              <button
                onClick={() => router.back()}
                className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
              <div className="flex gap-2">
                <ShareButton
                  title={experience.title}
                  description={`${experience.city} - ${experience.festival?.name || 'Experiencia única'}`}
                  className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-lg"
                />
                <button
                  onClick={handleToggleFavorite}
                  disabled={favoriteLoading}
                  className={`w-11 h-11 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg transition-colors ${
                    isFavorite ? 'bg-red-500 text-white' : 'bg-white/20 text-white'
                  }`}
                >
                  {favoriteLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : isFavorite ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                    </svg>
                  )}
                </button>
                {!isOwner && (
                  <ReportButton
                    type="experience"
                    id={experience.id}
                    className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-lg hover:bg-white/30"
                  />
                )}
              </div>
            </div>

            {/* Content overlay on image - mobile only */}
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white z-10 pointer-events-none lg:hidden">
              {/* Title */}
              <h1 className="text-2xl font-bold mb-2">
                {experience.festival ? `${experience.festival.name} en ${experience.city}` : experience.title}
              </h1>

              {/* Host & location */}
              <div className="flex items-center gap-2 text-white/90 text-sm mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-400">
                  <path fillRule="evenodd" d="m11.54 22.351.07.04.028.016a.76.76 0 0 0 .723 0l.028-.015.071-.041a16.975 16.975 0 0 0 1.144-.742 19.58 19.58 0 0 0 2.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 0 0-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 0 0 2.682 2.282 16.975 16.975 0 0 0 1.145.742ZM12 13.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
                </svg>
                <span>Con {experience.host.name} · {experience.city}, España</span>
              </div>

              {/* Hashtags */}
              <div className="flex gap-2 mb-3">
                {hashtags.slice(0, 3).map((tag: string, i: number) => (
                  <span key={i} className="text-blue-300 text-sm font-medium">{tag}</span>
                ))}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
                  </svg>
                  <span>{formatParticipants(experience._count?.matches || 0)} Participantes</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-yellow-400">★</span>
                  <span className="font-medium">{experience.avgRating?.toFixed(1) || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Content */}
        <div>
          {/* Desktop header with back button, share, favorite */}
          <div className="hidden lg:flex items-center justify-between mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              <span>Volver</span>
            </button>
            <div className="flex gap-3">
              <ShareButton
                title={experience.title}
                description={`${experience.city} - ${experience.festival?.name || 'Experiencia única'}`}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
              />
              <button
                onClick={handleToggleFavorite}
                disabled={favoriteLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                  isFavorite ? 'bg-red-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {favoriteLoading ? (
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                ) : isFavorite ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
                    </svg>
                    <span>Guardado</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                    </svg>
                    <span>Guardar</span>
                  </>
                )}
              </button>
              {!isOwner && (
                <ReportButton
                  type="experience"
                  id={experience.id}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 hover:text-red-500 transition-colors"
                />
              )}
            </div>
          </div>

          {/* Desktop title section */}
          <div className="hidden lg:block mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {experience.festival ? `${experience.festival.name} en ${experience.city}` : experience.title}
            </h1>
            <div className="flex items-center gap-4 text-gray-600 mb-3">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-500">
                  <path fillRule="evenodd" d="m11.54 22.351.07.04.028.016a.76.76 0 0 0 .723 0l.028-.015.071-.041a16.975 16.975 0 0 0 1.144-.742 19.58 19.58 0 0 0 2.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 0 0-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 0 0 2.682 2.282 16.975 16.975 0 0 0 1.145.742ZM12 13.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
                </svg>
                <span>{experience.city}, España</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-400">
                  <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
                </svg>
                <span>{formatParticipants(experience._count?.matches || 0)} Participantes</span>
              </div>
              <div className="flex items-center gap-1">
                {experience._count?.reviews ? (
                  <>
                    <span className="text-yellow-500 text-lg">★</span>
                    <span className="font-semibold">{experience.avgRating?.toFixed(1)}</span>
                    <span className="text-gray-400">({experience._count.reviews} {experience._count.reviews === 1 ? 'reseña' : 'reseñas'})</span>
                  </>
                ) : (
                  <span className="text-gray-400 text-sm">Sin reseñas aún</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {hashtags.slice(0, 3).map((tag: string, i: number) => (
                <span key={i} className="text-blue-600 text-sm font-medium bg-blue-50 px-3 py-1 rounded-full">{tag}</span>
              ))}
            </div>
          </div>

          {/* Content sections */}
          <div className="p-4 lg:p-0 space-y-4 -mt-4 lg:mt-0 relative z-10">
        {/* Host card */}
        <Link href={`/profile/${experience.hostId}`} className="block bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-pink-100 overflow-hidden shadow-md">
                {experience.host.avatar ? (
                  <Image
                    src={getHostAvatar(experience.host.avatar) || ''}
                    alt={experience.host.name}
                    className="w-full h-full object-cover"
                    width={64} height={64} unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-600">
                    {experience.host.name.charAt(0)}
                  </div>
                )}
              </div>
              {experience.host.verified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white border-2 border-white">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-0.5">Anfitrión</p>
              <p className="font-bold text-gray-900 text-lg">{experience.host.name}</p>
              <p className="text-sm text-gray-500">{experience.host.city}</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-400">
              <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </div>
          {experience.host.bio && (
            <div className="px-4 pb-4">
              <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 italic">&ldquo;{experience.host.bio}&rdquo;</p>
            </div>
          )}
        </Link>

        {/* Description */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-lg">📖</span> Sobre esta experiencia
          </h2>
          <p className="text-gray-700 leading-relaxed">{experience.description}</p>
        </div>

        {/* Highlights */}
        {highlights.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-lg">✨</span> Qué incluye
            </h2>
            <div className="space-y-3">
              {highlights.map((item: string, i: number) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white" className="w-4 h-4">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick info cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <div className="text-2xl mb-1">{experience.festival ? '🎪' : '📅'}</div>
            <div className="text-xs text-gray-500">{experience.festival ? 'Festividad' : 'Tipo'}</div>
            <div className="font-semibold text-gray-900 text-sm truncate">{experience.festival?.name || 'Todo el año'}</div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <div className="text-2xl mb-1">📍</div>
            <div className="text-xs text-gray-500">Ciudad</div>
            <div className="font-semibold text-gray-900 text-sm">{experience.city}</div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <div className="text-2xl mb-1">
              {experience.type === 'pago' && '💰'}
              {experience.type === 'intercambio' && '🔄'}
              {experience.type === 'ambos' && '✨'}
            </div>
            <div className="text-xs text-gray-500">Modalidad</div>
            <div className="font-semibold text-gray-900 text-sm">
              {experience.type === 'pago' && 'De pago'}
              {experience.type === 'intercambio' && 'Intercambio'}
              {experience.type === 'ambos' && 'Flexible'}
            </div>
          </div>
        </div>

        {/* Calendar */}
        {availabilityDates.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <span className="text-lg">📅</span> Disponibilidad
              </h2>
              <p className="text-sm text-gray-500">{availabilityDates.length} fechas disponibles</p>
            </div>
            <div className="p-4">
              <AvailabilityCalendar
                availableDates={availabilityDates}
                mode="view"
                occupancy={occupancy}
                initialDate={availabilityDates[0]}
              />
            </div>
          </div>
        )}

        {/* Reviews */}
        {experience.reviews && experience.reviews.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">Reseñas</h2>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <span className="text-yellow-500">★</span>
                  <span className="font-medium text-gray-900">{experience.avgRating?.toFixed(1)}</span>
                  <span>· {experience._count?.reviews} reseñas</span>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-4">
              {experience.reviews.slice(0, 3).map((review) => (
                <div key={review.id} className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    {review.author.avatar ? (
                      <Image src={getHostAvatar(review.author.avatar) || ''} alt="" className="w-full h-full object-cover" width={40} height={40} unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 font-medium">
                        {review.author.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-gray-900">{review.author.name}</span>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className={`text-xs ${i < review.rating ? 'text-yellow-500' : 'text-gray-200'}`}>★</span>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{review.comment}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Owner actions */}
        {isOwner && (
          <Link href={`/experiences/${experience.id}/edit`} className="block bg-white rounded-2xl shadow-sm p-4 text-center font-semibold text-primary">
            ✏️ Editar experiencia
          </Link>
        )}

        {/* Desktop booking card - sticky sidebar style (#54) */}
        <div className="hidden lg:block bg-white rounded-2xl shadow-lg p-6 mt-4 border border-gray-100 lg:sticky lg:top-24">
          <div className="flex items-center justify-between mb-4">
            {experience.price ? (
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{experience.price}€</span>
                  <span className="text-gray-500">/persona</span>
                </div>
                {experience.maxParticipants && experience.maxParticipants > 1 && (
                  <p className="text-sm text-green-600">Descuento para grupos disponible</p>
                )}
              </div>
            ) : (
              <div className="text-teal-600 font-bold text-xl">Intercambio de experiencias</div>
            )}
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <span className="text-yellow-500 text-lg">★</span>
              <span className="font-semibold text-gray-900">{experience.avgRating?.toFixed(1) || '-'}</span>
              <span>({experience._count?.reviews || 0})</span>
            </div>
          </div>
          {!isOwner && (
            <Link
              href={`/experiences/${experience.id}/book`}
              className="block w-full py-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-center text-lg"
            >
              {experience.type === 'intercambio' ? 'Proponer intercambio' : 'Reservar ahora'}
            </Link>
          )}
        </div>
        </div>
        {/* End of content sections */}
        </div>
        {/* End of right column */}
      </div>
      {/* End of 2-column grid */}

      {/* Mobile fixed bottom bar */}
      <div className="fixed-bottom-bar bg-white border-t border-gray-200 p-4 lg:hidden">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            {experience.price ? (
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{experience.price}€</span>
                  <span className="text-gray-500 text-sm">/persona</span>
                </div>
                {experience.maxParticipants && experience.maxParticipants > 1 && (
                  <p className="text-xs text-green-600">Descuento grupos</p>
                )}
              </div>
            ) : (
              <div className="text-teal-600 font-bold text-lg">Intercambio</div>
            )}
          </div>
          {!isOwner && (
            <Link
              href={`/experiences/${experience.id}/book`}
              className="flex-1 py-4 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition-colors text-center ripple"
            >
              {experience.type === 'intercambio' ? 'Proponer intercambio' : 'Reservar ahora'}
            </Link>
          )}
        </div>
      </div>

      {/* Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:w-[420px] sm:rounded-2xl rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Solicitar experiencia</h2>
              <button
                onClick={() => { setShowModal(false); setDateRange({ start: null, end: null }); setMessage(''); setSubmitError(''); setParticipants(1); setParticipantNames([]); }}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Experience summary */}
            <div className="bg-gray-50 rounded-xl p-3 mb-4 flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                {experience.photos?.[0] ? (
                  <Image src={getImageUrl(experience.photos[0]) || ''} alt={experience.title} className="w-full h-full object-cover" width={56} height={56} unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-blue-100 to-pink-100">🎉</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{experience.title}</h3>
                <p className="text-xs text-gray-500">con {experience.host.name}</p>
                {experience.price && (
                  <p className="text-sm font-bold text-blue-600 mt-1">
                    Desde {experience.price}€/persona
                    {experience.maxParticipants && experience.maxParticipants > 1 && (
                      <span className="text-xs font-normal text-green-600 ml-1">(descuento grupos)</span>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Date range selection */}
            {availabilityDates.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecciona las fechas
                </label>
                {dateRange.start && dateRange.end ? (
                  <div className="flex items-center justify-between bg-blue-50 text-blue-700 p-3 rounded-xl mb-3">
                    <span className="font-medium text-sm">
                      📅 {dateRange.start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      {' → '}
                      {dateRange.end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </span>
                    <button onClick={() => setDateRange({ start: null, end: null })} className="text-sm underline">Cambiar</button>
                  </div>
                ) : dateRange.start ? (
                  <div className="bg-amber-50 text-amber-700 p-3 rounded-xl mb-3 text-sm">
                    📅 Inicio: {dateRange.start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - Selecciona fecha de fin
                  </div>
                ) : null}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <AvailabilityCalendar
                    mode="range"
                    dateRange={dateRange}
                    onRangeChange={setDateRange}
                    availableDates={availabilityDates}
                    occupancy={occupancy}
                    initialDate={availabilityDates[0]}
                  />
                </div>
              </div>
            )}

            {/* Participants selector */}
            {(experience.type === 'pago' || experience.type === 'ambos') && experience.price && (
              <div className="mb-4">
                <ParticipantSelector
                  experienceId={experience.id}
                  basePrice={experience.price}
                  minParticipants={experience.minParticipants || 1}
                  maxParticipants={experience.maxParticipants || experience.capacity || 10}
                  onChange={handleParticipantsChange}
                  showNames={participants > 1}
                  onNamesChange={setParticipantNames}
                />
              </div>
            )}

            {/* Message */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Mensaje (opcional)</label>
              <textarea
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Preséntate brevemente..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            {submitError && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4">{submitError}</div>}

            <button
              onClick={handleSubmitRequest}
              className="w-full py-4 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          </div>
        </div>
      )}
    </div>
    </MainLayout>
  );
}
