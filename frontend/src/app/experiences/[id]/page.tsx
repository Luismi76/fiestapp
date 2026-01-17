'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { experiencesApi, matchesApi } from '@/lib/api';
import { ExperienceDetail } from '@/types/experience';
import { useAuth } from '@/contexts/AuthContext';
import { getAvatarUrl, getUploadUrl } from '@/lib/utils';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';

// Helper to generate availability dates for mock data
const generateMockAvailability = (baseMonth: number, count: number): Date[] => {
  const dates: Date[] = [];
  const year = new Date().getFullYear();
  const month = baseMonth - 1;

  for (let i = 0; i < count; i++) {
    const day = Math.floor(Math.random() * 28) + 1;
    const date = new Date(year, month, day);
    if (date > new Date() && !dates.some(d => d.getDate() === day)) {
      dates.push(date);
    }
  }
  return dates.sort((a, b) => a.getTime() - b.getTime());
};

// Mock experiences for fallback
const mockExperiencesMap: Record<string, any> = {
  'exp-1': {
    id: 'exp-1',
    title: 'Vive la Feria como un sevillano',
    description: 'Disfruta de la auténtica experiencia de la Feria de Abril con una familia local. Incluye traje de flamenca y acceso a caseta privada.',
    highlights: [
      'Traje de flamenca/traje corto auténtico incluido',
      'Acceso a caseta familiar con comida y bebida',
      'Clase de sevillanas con mi abuela',
      'Historia y tradiciones de la Feria',
      'Ambiente único del Real de la Feria'
    ],
    city: 'Sevilla',
    price: 45,
    type: 'pago',
    photos: ['/images/feria_abril.png'],
    published: true,
    hostId: 'user-maria',
    festivalId: 'fest-feria',
    host: {
      id: 'user-maria',
      name: 'María García',
      avatar: '/images/user_maria.png',
      verified: true,
      bio: 'Sevillana de toda la vida. Me encanta compartir nuestras tradiciones con visitantes de todo el mundo.',
      city: 'Sevilla'
    },
    festival: { id: 'fest-feria', name: 'Feria de Abril', city: 'Sevilla' },
    avgRating: 4.9,
    _count: { reviews: 127, matches: 3800 },
    reviews: [
      { id: '1', rating: 5, comment: '¡Increíble experiencia! María fue muy amable y la caseta estaba genial.', createdAt: '2024-04-20', author: { id: '10', name: 'Laura M.', avatar: '/images/user_laura.png', verified: true } },
      { id: '2', rating: 5, comment: 'La mejor forma de vivir la Feria. Totalmente recomendado.', createdAt: '2024-04-18', author: { id: '11', name: 'Carlos P.', avatar: '/images/user_carlos.png', verified: true } },
    ],
    availability: generateMockAvailability(4, 12),
    hashtags: ['#FeriaDeAbril', '#Sevilla', '#Tradición'],
  },
  'exp-2': {
    id: 'exp-2',
    title: 'Encierro y tapas tradicionales',
    description: 'Vive San Fermín desde dentro. Te llevaré a ver el encierro desde los mejores spots y después tapeo por el casco antiguo.',
    highlights: [
      'Acceso a balcón privilegiado para el encierro',
      'Ruta de tapas por el casco antiguo',
      'Historia y tradiciones de San Fermín',
      'Consejos de un local'
    ],
    city: 'Pamplona',
    price: null,
    type: 'intercambio',
    photos: ['/images/san_fermin.png'],
    published: true,
    hostId: 'user-carlos',
    festivalId: 'fest-sanfermin',
    host: {
      id: 'user-carlos',
      name: 'Carlos Martínez',
      avatar: '/images/user_carlos.png',
      verified: true,
      bio: 'Pamplonés de nacimiento. Llevo corriendo encierros desde los 18 años.',
      city: 'Pamplona'
    },
    festival: { id: 'fest-sanfermin', name: 'San Fermín', city: 'Pamplona' },
    avgRating: 4.8,
    _count: { reviews: 89, matches: 2100 },
    reviews: [
      { id: '3', rating: 5, comment: 'Carlos conoce todos los rincones de Pamplona. Auténtico.', createdAt: '2024-07-10', author: { id: '12', name: 'Anna S.', avatar: null, verified: false } },
    ],
    availability: generateMockAvailability(7, 8),
    hashtags: ['#SanFermín', '#Encierros', '#Pamplona'],
  },
  'exp-3': {
    id: 'exp-3',
    title: 'Mascletà y paella valenciana',
    description: 'Experiencia completa de Fallas: mascletà en la plaza del Ayuntamiento, visita a las fallas y paella en mi casa.',
    highlights: [
      'Plaza reservada para la mascletà',
      'Tour guiado por las mejores fallas',
      'Paella tradicional en casa',
      'Receta secreta de mi abuela'
    ],
    city: 'Valencia',
    price: 35,
    type: 'pago',
    photos: ['/images/las_fallas.png'],
    published: true,
    hostId: 'user-laura',
    festivalId: 'fest-fallas',
    host: {
      id: 'user-laura',
      name: 'Laura Pérez',
      avatar: '/images/user_laura.png',
      verified: true,
      bio: 'Valenciana apasionada por las Fallas. Mi familia lleva 4 generaciones siendo falleros.',
      city: 'Valencia'
    },
    festival: { id: 'fest-fallas', name: 'Las Fallas', city: 'Valencia' },
    avgRating: 5.0,
    _count: { reviews: 64, matches: 1500 },
    reviews: [],
    availability: generateMockAvailability(3, 10),
    hashtags: ['#Fallas', '#Valencia', '#Mascletà'],
  },
  'exp-4': {
    id: 'exp-4',
    title: 'La batalla del tomate',
    description: 'Te acompaño a vivir La Tomatina y después comida casera para recuperar fuerzas.',
    highlights: [
      'Camiseta blanca y gafas incluidas',
      'Acompañamiento durante la batalla',
      'Zona para ducharte',
      'Comida casera post-batalla'
    ],
    city: 'Buñol',
    price: 25,
    type: 'ambos',
    photos: ['/images/la_tomatina.png'],
    published: true,
    hostId: 'user-pedro',
    festivalId: 'fest-tomatina',
    host: {
      id: 'user-pedro',
      name: 'Pedro Sánchez',
      avatar: '/images/user_pedro.png',
      verified: false,
      bio: 'De Buñol, vivo La Tomatina desde pequeño. ¡La mejor fiesta del mundo!',
      city: 'Valencia'
    },
    festival: { id: 'fest-tomatina', name: 'La Tomatina', city: 'Buñol' },
    avgRating: 4.7,
    _count: { reviews: 203, matches: 4200 },
    reviews: [],
    availability: generateMockAvailability(8, 6),
    hashtags: ['#Tomatina', '#Buñol', '#Fiesta'],
  },
  'exp-5': {
    id: 'exp-5',
    title: 'Procesiones y saetas',
    description: 'Te guío por las mejores procesiones de Semana Santa, explicándote cada paso y cofradía.',
    highlights: [
      'Ruta por procesiones emblemáticas',
      'Explicación histórica y religiosa',
      'Mejores puntos para fotografiar',
      'Saetas en directo'
    ],
    city: 'Sevilla',
    price: 30,
    type: 'pago',
    photos: ['/images/semana_santa.png'],
    published: true,
    hostId: 'user-juan',
    festivalId: 'fest-semanasanta',
    host: {
      id: 'user-juan',
      name: 'Juan y Carmen',
      avatar: '/images/user_juan.png',
      verified: true,
      bio: 'Cofrade desde hace 30 años. La Semana Santa es mi pasión.',
      city: 'Sevilla'
    },
    festival: { id: 'fest-semanasanta', name: 'Semana Santa', city: 'Sevilla' },
    avgRating: 4.9,
    _count: { reviews: 156, matches: 3800 },
    reviews: [],
    availability: generateMockAvailability(4, 14),
    hashtags: ['#SemanaSanta', '#Tradición', '#Sevilla'],
  },
  'exp-6': {
    id: 'exp-6',
    title: 'Carnaval gaditano auténtico',
    description: 'Vive el Carnaval de Cádiz como un local: chirigotas, comparsas y pescaíto frito.',
    highlights: [
      'Tour por las calles del Carnaval',
      'Visita al Teatro Falla',
      'Ruta gastronómica gaditana',
      'Fiesta en el barrio de La Viña'
    ],
    city: 'Cádiz',
    price: null,
    type: 'intercambio',
    photos: ['/images/carnaval.png'],
    published: true,
    hostId: 'user-ana',
    festivalId: 'fest-carnaval',
    host: {
      id: 'user-ana',
      name: 'Ana López',
      avatar: '/images/user_ana.png',
      verified: true,
      bio: 'Gaditana de corazón. El Carnaval corre por mis venas.',
      city: 'Cádiz'
    },
    festival: { id: 'fest-carnaval', name: 'Carnaval de Cádiz', city: 'Cádiz' },
    avgRating: 4.8,
    _count: { reviews: 92, matches: 2800 },
    reviews: [
      { id: '5', rating: 5, comment: 'El Carnaval con Ana fue espectacular. ¡Volveré!', createdAt: '2024-02-18', author: { id: 'user-demo', name: 'Usuario D.', avatar: null, verified: false } },
    ],
    availability: generateMockAvailability(2, 15),
    hashtags: ['#Carnaval', '#Cádiz', '#Chirigotas'],
  },
};

export default function ExperienceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [experience, setExperience] = useState<ExperienceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [useMockData, setUseMockData] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const fetchExperience = async () => {
      const id = params.id as string;
      try {
        const data = await experiencesApi.getById(id);
        setExperience(data);
        setUseMockData(false);
      } catch {
        if (mockExperiencesMap[id]) {
          setExperience(mockExperiencesMap[id] as ExperienceDetail);
          setUseMockData(true);
        } else {
          setError('No se pudo cargar la experiencia');
        }
      } finally {
        setLoading(false);
      }
    };
    if (params.id) fetchExperience();
  }, [params.id]);

  const handleRequestMatch = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setShowModal(true);
  };

  const handleSubmitRequest = async () => {
    if (!experience) return;
    if (useMockData) {
      const dateStr = selectedDate
        ? selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
        : 'Sin fecha específica';
      setShowModal(false);
      alert(`¡Solicitud enviada! (Modo demo)\n\nFecha: ${dateStr}`);
      setSelectedDate(null);
      setMessage('');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const match = await matchesApi.create({
        experienceId: experience.id,
        message: message.trim() || undefined,
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="spinner spinner-lg mx-auto mb-4" />
          <p className="text-gray-500">Cargando experiencia...</p>
        </div>
      </div>
    );
  }

  if (error || !experience) {
    return (
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
    );
  }

  const isOwner = user?.id === experience.hostId;
  const highlights = experience.highlights || [];
  const hashtags = (experience as any).hashtags || ['#' + experience.festival.name.replace(/\s/g, '')];

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Hero Image - Full screen style */}
      <div className="relative">
        <div className="aspect-[3/4] max-h-[70vh] bg-gray-900">
          {experience.photos && experience.photos.length > 0 ? (
            <img
              src={getImageUrl(experience.photos[currentPhotoIndex])}
              alt={experience.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700 flex items-center justify-center">
              <span className="text-9xl opacity-50">🎉</span>
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
        </div>

        {/* Header buttons */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-6">
          <button
            onClick={() => router.back()}
            className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div className="flex gap-2">
            <button className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
              </svg>
            </button>
            <button className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Photo indicator */}
        {experience.photos && experience.photos.length > 1 && (
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex gap-1.5">
            {experience.photos.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPhotoIndex(i)}
                className={`h-1.5 rounded-full transition-all ${i === currentPhotoIndex ? 'bg-white w-6' : 'bg-white/50 w-1.5'}`}
              />
            ))}
          </div>
        )}

        {/* Content overlay on image */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          {/* Title */}
          <h1 className="text-2xl font-bold mb-2">
            {experience.festival.name} en {experience.city}
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

      {/* Mock indicator */}
      {useMockData && (
        <div className="bg-amber-50 text-amber-700 text-xs px-4 py-2 text-center">
          Datos de demostración
        </div>
      )}

      {/* Content sections */}
      <div className="p-4 space-y-4 -mt-4 relative z-10">
        {/* Action buttons - like the mockup */}
        {!isOwner && (
          <div className="flex gap-3">
            <button
              onClick={handleRequestMatch}
              className="flex-1 py-3.5 bg-white text-gray-900 font-semibold rounded-full text-center border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
            >
              Unirme
            </button>
            <button
              onClick={handleRequestMatch}
              className="flex-1 py-3.5 bg-blue-500 text-white font-semibold rounded-full text-center shadow-sm hover:bg-blue-600 transition-colors"
            >
              Ver Detalles
            </button>
          </div>
        )}

        {/* Host card */}
        <Link href={`/profile/${experience.hostId}`} className="block bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-pink-100 overflow-hidden shadow-md">
                {experience.host.avatar ? (
                  <img
                    src={getHostAvatar(experience.host.avatar) || ''}
                    alt={experience.host.name}
                    className="w-full h-full object-cover"
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
              <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 italic">"{experience.host.bio}"</p>
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
            <div className="text-2xl mb-1">🎪</div>
            <div className="text-xs text-gray-500">Festividad</div>
            <div className="font-semibold text-gray-900 text-sm truncate">{experience.festival.name}</div>
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
              {experience.type === 'pago' && `${experience.price}€`}
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
                selectedDates={[]}
                onDatesChange={() => {}}
                availableDates={availabilityDates}
                mode="view"
                onDateClick={(date) => {
                  setSelectedDate(date);
                  setShowModal(true);
                }}
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
              {experience.reviews.slice(0, 3).map((review: any) => (
                <div key={review.id} className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    {review.author.avatar ? (
                      <img src={getHostAvatar(review.author.avatar) || ''} alt="" className="w-full h-full object-cover" />
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
          <Link href={`/experiences/${experience.id}/edit`} className="block bg-white rounded-2xl shadow-sm p-4 text-center font-semibold text-blue-600">
            ✏️ Editar experiencia
          </Link>
        )}
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            {experience.price ? (
              <div>
                <span className="text-2xl font-bold">{experience.price}€</span>
                <span className="text-gray-500 text-sm">/persona</span>
              </div>
            ) : (
              <div className="text-teal-600 font-bold text-lg">Intercambio</div>
            )}
          </div>
          {!isOwner && (
            <button onClick={handleRequestMatch} className="flex-1 py-4 bg-blue-500 text-white font-semibold rounded-full hover:bg-blue-600 transition-colors">
              {experience.type === 'intercambio' ? 'Proponer intercambio' : 'Reservar ahora'}
            </button>
          )}
        </div>
      </div>

      {/* Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:w-96 sm:rounded-2xl rounded-t-2xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Solicitar experiencia</h2>
              <button
                onClick={() => { setShowModal(false); setSelectedDate(null); setMessage(''); setSubmitError(''); }}
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
                  <img src={getImageUrl(experience.photos[0])} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-blue-100 to-pink-100">🎉</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{experience.title}</h3>
                <p className="text-xs text-gray-500">con {experience.host.name}</p>
                {experience.price && <p className="text-sm font-bold text-blue-600 mt-1">{experience.price}€/persona</p>}
              </div>
            </div>

            {/* Date selection */}
            {availabilityDates.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
                {selectedDate ? (
                  <div className="flex items-center justify-between bg-blue-50 text-blue-700 p-3 rounded-xl">
                    <span className="font-medium text-sm">
                      📅 {selectedDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    <button onClick={() => setSelectedDate(null)} className="text-sm underline">Cambiar</button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availabilityDates.slice(0, 6).map((date, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(date)}
                        className="px-3 py-2 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 rounded-lg text-sm transition-colors"
                      >
                        {date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </button>
                    ))}
                  </div>
                )}
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
            {useMockData && <div className="bg-amber-50 text-amber-700 p-3 rounded-xl text-sm mb-4">Modo demostración</div>}

            <button
              onClick={handleSubmitRequest}
              className="w-full py-4 bg-blue-500 text-white font-semibold rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
