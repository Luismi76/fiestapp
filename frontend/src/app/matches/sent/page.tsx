'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { matchesApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Match, MatchStatus } from '@/types/match';
import { getAvatarUrl, getUploadUrl } from '@/lib/utils';
import BottomNav from '@/components/BottomNav';

// Mock data for fallback
const mockSentMatches: Match[] = [
  {
    id: '10',
    status: 'accepted',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    experienceId: '1',
    requesterId: 'me',
    hostId: '1',
    experience: {
      id: '1',
      title: 'Vive la Feria como un sevillano',
      city: 'Sevilla',
      type: 'pago',
      price: 45,
      photos: ['/images/feria_abril.png'],
      festival: { id: '1', name: 'Feria de Abril', city: 'Sevilla' },
    } as any,
    requester: {
      id: 'me',
      name: 'Yo',
      verified: false,
    },
    host: {
      id: '1',
      name: 'María García',
      avatar: '/images/user_maria.png',
      verified: true,
      city: 'Sevilla',
    },
    _count: { messages: 8 },
  },
  {
    id: '11',
    status: 'pending',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    experienceId: '2',
    requesterId: 'me',
    hostId: '2',
    experience: {
      id: '2',
      title: 'Encierro y tapas tradicionales',
      city: 'Pamplona',
      type: 'intercambio',
      photos: ['/images/san_fermin.png'],
      festival: { id: '2', name: 'San Fermín', city: 'Pamplona' },
    } as any,
    requester: {
      id: 'me',
      name: 'Yo',
      verified: false,
    },
    host: {
      id: '2',
      name: 'Carlos Martínez',
      avatar: '/images/user_carlos.png',
      verified: true,
      city: 'Pamplona',
    },
    _count: { messages: 0 },
  },
  {
    id: '12',
    status: 'completed',
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    experienceId: '6',
    requesterId: 'me',
    hostId: '6',
    experience: {
      id: '6',
      title: 'Carnaval gaditano auténtico',
      city: 'Cádiz',
      type: 'intercambio',
      photos: ['/images/carnaval.png'],
      festival: { id: '6', name: 'Carnaval de Cádiz', city: 'Cádiz' },
    } as any,
    requester: {
      id: 'me',
      name: 'Yo',
      verified: false,
    },
    host: {
      id: '6',
      name: 'Ana López',
      avatar: '/images/user_ana.png',
      verified: true,
      city: 'Cádiz',
    },
    _count: { messages: 15 },
  },
];

const statusConfig: Record<MatchStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: 'Pendiente', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  accepted: { label: 'Aceptada', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  rejected: { label: 'Rechazada', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  cancelled: { label: 'Cancelada', bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' },
  completed: { label: 'Completada', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
};

export default function SentMatchesPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MatchStatus | 'all'>('all');
  const [useMockData, setUseMockData] = useState(false);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const status = filter === 'all' ? undefined : filter;
        const data = await matchesApi.getSent(status);
        if (data && data.length > 0) {
          setMatches(data);
          setUseMockData(false);
        } else {
          setMatches(mockSentMatches);
          setUseMockData(true);
        }
      } catch (err) {
        console.log('Using mock data for sent matches');
        setMatches(mockSentMatches);
        setUseMockData(true);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [filter]);

  const filteredMatches = useMockData && filter !== 'all'
    ? matches.filter(m => m.status === filter)
    : matches;

  const handleCancel = async (matchId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('¿Estás seguro de que quieres cancelar esta solicitud?')) {
      return;
    }

    if (useMockData) {
      setMatches(matches.map(m =>
        m.id === matchId ? { ...m, status: 'cancelled' as MatchStatus } : m
      ));
      return;
    }

    try {
      await matchesApi.cancel(matchId);
      setMatches(matches.map(m =>
        m.id === matchId ? { ...m, status: 'cancelled' as MatchStatus } : m
      ));
    } catch (err) {
      console.error('Error cancelling match:', err);
    }
  };

  const getImageSrc = (photos?: string[]) => {
    if (!photos || photos.length === 0) return null;
    const photo = photos[0];
    if (photo.startsWith('/images/')) return photo;
    return getUploadUrl(photo);
  };

  const getAvatarSrc = (avatar?: string) => {
    if (!avatar) return '/images/user_ana.png';
    if (avatar.startsWith('/images/')) return avatar;
    return getAvatarUrl(avatar);
  };

  const formatTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Ahora';
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner spinner-lg mx-auto mb-4" />
          <div className="text-gray-500">Cargando solicitudes...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="font-semibold text-gray-900">Mensajes</span>
          <div className="w-10" />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <Link
            href="/matches/received"
            className="flex-1 py-3 text-center font-medium text-gray-500 hover:text-gray-700"
          >
            Recibidas
          </Link>
          <Link
            href="/matches/sent"
            className="flex-1 py-3 text-center font-medium text-blue-600 border-b-2 border-blue-600"
          >
            Enviadas
          </Link>
        </div>

        {/* Filters */}
        <div className="px-4 py-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2">
            {(['all', 'pending', 'accepted', 'completed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  filter === status
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                }`}
              >
                {status === 'all' && 'Todas'}
                {status === 'pending' && 'Pendientes'}
                {status === 'accepted' && 'Aceptadas'}
                {status === 'completed' && 'Completadas'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mock data indicator */}
      {useMockData && (
        <div className="bg-amber-50 text-amber-700 text-xs px-4 py-2 text-center flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
          </svg>
          Datos de demostración
        </div>
      )}

      {/* List */}
      {filteredMatches.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-20">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-blue-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </div>
          <h2 className="font-bold text-xl text-gray-900 mb-2">Sin solicitudes enviadas</h2>
          <p className="text-gray-500 text-center mb-8 max-w-xs">
            {filter === 'all'
              ? 'Explora experiencias y envía solicitudes para conectar con anfitriones locales'
              : `No tienes solicitudes ${statusConfig[filter as MatchStatus].label.toLowerCase()}s`}
          </p>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-full hover:bg-blue-600 transition-colors shadow-lg"
          >
            Explorar experiencias
          </Link>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {filteredMatches.map((match) => {
            const config = statusConfig[match.status];
            const imageSrc = getImageSrc(match.experience.photos);

            return (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className="bg-white rounded-2xl overflow-hidden shadow-sm block hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="flex">
                  {/* Experience thumbnail */}
                  <div className="w-28 h-full min-h-[120px] relative flex-shrink-0">
                    {imageSrc ? (
                      <img
                        src={imageSrc}
                        alt={match.experience.title}
                        className="w-full h-full object-cover absolute inset-0"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center absolute inset-0">
                        <span className="text-4xl text-white/50">
                          {match.experience.type === 'pago' ? '🎭' : '🤝'}
                        </span>
                      </div>
                    )}
                    {/* Status overlay */}
                    <div className="absolute top-2 left-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${config.bg} ${config.text} backdrop-blur-sm`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                        {config.label}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-3 min-w-0 flex flex-col">
                    {/* Experience title */}
                    <h3 className="font-semibold text-gray-900 line-clamp-1 text-sm">
                      {match.experience.title}
                    </h3>

                    {/* Festival badge */}
                    <p className="text-xs text-blue-600 font-medium mt-1">
                      {match.experience.festival?.name || 'Festividad'}
                    </p>

                    {/* Host info */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-white shadow-sm">
                        <img
                          src={getAvatarSrc(match.host.avatar)}
                          alt={match.host.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-gray-700">{match.host.name}</span>
                        {match.host.verified && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-500">
                            <path fillRule="evenodd" d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Bottom row */}
                    <div className="flex items-center justify-between mt-auto pt-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{formatTimeAgo(match.createdAt)}</span>
                        {match._count?.messages && match._count.messages > 0 && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                              <path d="M1 8.74c0 .983.713 1.825 1.69 1.943.764.092 1.534.164 2.31.216v2.351a.75.75 0 0 0 1.28.53l2.51-2.51c.182-.181.427-.29.686-.31a44.74 44.74 0 0 0 3.834-.449C14.287 10.565 15 9.723 15 8.74V4.26c0-.983-.713-1.825-1.69-1.943a44.507 44.507 0 0 0-10.62 0C1.713 2.435 1 3.277 1 4.26v4.482Z" />
                            </svg>
                            {match._count.messages}
                          </span>
                        )}
                      </div>

                      {/* Cancel button for pending */}
                      {match.status === 'pending' ? (
                        <button
                          onClick={(e) => handleCancel(match.id, e)}
                          className="text-xs text-red-500 font-medium hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          Cancelar
                        </button>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-300">
                          <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
