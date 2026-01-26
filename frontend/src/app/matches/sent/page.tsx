'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { matchesApi, walletApi, WalletInfo } from '@/lib/api';
import { Match, MatchStatus } from '@/types/match';
import { getAvatarUrl, getUploadUrl, formatTimeAgo } from '@/lib/utils';
import MainLayout from '@/components/MainLayout';
import ConfirmModal from '@/components/ConfirmModal';
import { useToast } from '@/components/ui/Toast';
import logger from '@/lib/logger';
import { getErrorMessage } from '@/lib/error';
import { mockSentMatches, statusConfig } from '@/__mocks__/matches';

export default function SentMatchesPage() {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MatchStatus | 'all'>('all');
  const [useMockData, setUseMockData] = useState(false);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);

  // Modal state
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; match: Match | null }>({ isOpen: false, match: null });
  const [actionLoading, setActionLoading] = useState(false);

  // Animation state
  const [animatingCards, setAnimatingCards] = useState<Record<string, boolean>>({});

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
      } catch {
        logger.log('Using mock data for sent matches');
        setMatches(mockSentMatches);
        setUseMockData(true);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [filter]);

  // Fetch wallet info
  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const wallet = await walletApi.getWallet();
        setWalletInfo(wallet);
      } catch {
        // Ignore wallet errors
      }
    };
    fetchWallet();
  }, []);

  const filteredMatches = useMockData && filter !== 'all'
    ? matches.filter(m => m.status === filter)
    : matches;

  // Open cancel modal
  const openCancelModal = (match: Match, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCancelModal({ isOpen: true, match });
  };

  // Confirm cancel
  const handleCancelConfirm = async () => {
    if (!cancelModal.match) return;
    const matchId = cancelModal.match.id;
    const experienceTitle = cancelModal.match.experience.title;

    setActionLoading(true);

    try {
      if (!useMockData) {
        await matchesApi.cancel(matchId);
      }

      // Close modal first
      setCancelModal({ isOpen: false, match: null });
      setActionLoading(false);

      // Start animation
      setAnimatingCards({ ...animatingCards, [matchId]: true });

      // Update match after animation
      setTimeout(() => {
        setMatches(matches.map(m =>
          m.id === matchId ? { ...m, status: 'cancelled' as MatchStatus } : m
        ));
        setAnimatingCards(prev => ({ ...prev, [matchId]: false }));
        showSuccess('Solicitud cancelada', `Has cancelado tu solicitud para "${experienceTitle}"`);
      }, 400);

    } catch (err) {
      setActionLoading(false);
      setCancelModal({ isOpen: false, match: null });
      showError('Error', getErrorMessage(err, 'No se pudo cancelar la solicitud'));
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

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="spinner spinner-lg mx-auto mb-4" />
            <div className="text-gray-500">Cargando solicitudes...</div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
    <div className="min-h-screen bg-white md:bg-transparent pb-24 md:pb-8">
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
            const isAnimating = animatingCards[match.id];

            return (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className={`
                  bg-white rounded-2xl overflow-hidden shadow-sm block hover:shadow-md transition-all active:scale-[0.98]
                  ${isAnimating ? 'transform scale-95 opacity-0 bg-gray-100 border-2 border-gray-300 duration-400' : ''}
                `}
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
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-3 min-w-0 flex flex-col">
                    {/* Experience title and unread badge */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`font-semibold line-clamp-1 text-sm ${match.unreadCount && match.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                        {match.experience.title}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-400">{formatTimeAgo(match.lastMessage?.createdAt || match.createdAt)}</span>
                        {match.unreadCount && match.unreadCount > 0 && (
                          <span className="w-5 h-5 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {match.unreadCount > 9 ? '9+' : match.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Host info */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="w-6 h-6 rounded-full overflow-hidden ring-2 ring-white shadow-sm">
                        <img
                          src={getAvatarSrc(match.host.avatar)}
                          alt={match.host.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-600">{match.host.name}</span>
                        {match.host.verified && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-blue-500">
                            <path fillRule="evenodd" d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Last message preview */}
                    {match.lastMessage ? (
                      <p className={`text-sm mt-1.5 line-clamp-1 ${match.unreadCount && match.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                        {match.lastMessage.senderId === 'me' && <span className="text-gray-400">Tu: </span>}
                        {match.lastMessage.content}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 mt-1.5 italic">
                        Sin mensajes aun
                      </p>
                    )}

                    {/* Bottom row */}
                    <div className="flex items-center justify-between mt-auto pt-2">
                      <div className="flex items-center gap-2">
                        {/* Status badge */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${config.bg} ${config.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                          {config.label}
                        </span>
                        {match._count?.messages && match._count.messages > 0 && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                              <path d="M1 8.74c0 .983.713 1.825 1.69 1.943.764.092 1.534.164 2.31.216v2.351a.75.75 0 0 0 1.28.53l2.51-2.51c.182-.181.427-.29.686-.31a44.74 44.74 0 0 0 3.834-.449C14.287 10.565 15 9.723 15 8.74V4.26c0-.983-.713-1.825-1.69-1.943a44.507 44.507 0 0 0-10.62 0C1.713 2.435 1 3.277 1 4.26v4.482Z" />
                            </svg>
                            {match._count.messages}
                          </span>
                        )}
                      </div>

                      {/* Cancel button for pending */}
                      {match.status === 'pending' ? (
                        <button
                          onClick={(e) => openCancelModal(match, e)}
                          className="h-8 px-3 flex items-center justify-center gap-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium text-xs transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                            <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                          </svg>
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

      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        isOpen={cancelModal.isOpen}
        onClose={() => setCancelModal({ isOpen: false, match: null })}
        onConfirm={handleCancelConfirm}
        title="Cancelar solicitud"
        variant="warning"
        confirmText="Cancelar solicitud"
        cancelText="Volver"
        isLoading={actionLoading}
        message={
          <div className="space-y-3">
            {cancelModal.match && (
              <>
                <p>
                  Vas a cancelar tu solicitud para la experiencia:
                </p>
                <div className="bg-gray-50 rounded-lg p-3 text-left">
                  <p className="font-medium text-gray-900">{cancelModal.match.experience.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Anfitrion: {cancelModal.match.host.name} - {cancelModal.match.experience.city}
                  </p>
                </div>
                {/* Wallet info */}
                {walletInfo && cancelModal.match.experience.type === 'pago' && cancelModal.match.experience.price && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-600">
                        <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium text-blue-800 text-sm">Informacion</span>
                    </div>
                    <p className="text-xs text-blue-700">
                      El precio de la experiencia es de <strong>{cancelModal.match.experience.price} EUR</strong>.
                      No se realizara ningun cargo al cancelar.
                    </p>
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  El anfitrion sera notificado de la cancelacion. Podras volver a solicitar esta experiencia en el futuro.
                </p>
              </>
            )}
          </div>
        }
      />
    </div>
    </MainLayout>
  );
}
