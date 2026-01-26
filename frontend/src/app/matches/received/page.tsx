'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { matchesApi, walletApi, WalletInfo } from '@/lib/api';
import { Match, MatchStatus } from '@/types/match';
import { getAvatarUrl, formatTimeAgo } from '@/lib/utils';
import MainLayout from '@/components/MainLayout';
import ConfirmModal from '@/components/ConfirmModal';
import { useToast } from '@/components/ui/Toast';
import logger from '@/lib/logger';
import { getErrorMessage } from '@/lib/error';
import { mockReceivedMatches, statusConfig } from '@/__mocks__/matches';

export default function ReceivedMatchesPage() {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MatchStatus | 'all'>('all');
  const [useMockData, setUseMockData] = useState(false);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);

  // Modal states
  const [acceptModal, setAcceptModal] = useState<{ isOpen: boolean; match: Match | null }>({ isOpen: false, match: null });
  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean; match: Match | null }>({ isOpen: false, match: null });
  const [actionLoading, setActionLoading] = useState(false);

  // Animation states for cards
  const [animatingCards, setAnimatingCards] = useState<Record<string, 'accept' | 'reject' | null>>({});

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const status = filter === 'all' ? undefined : filter;
        const data = await matchesApi.getReceived(status);
        if (data && data.length > 0) {
          setMatches(data);
          setUseMockData(false);
        } else {
          setMatches(mockReceivedMatches);
          setUseMockData(true);
        }
      } catch {
        logger.log('Using mock data for matches');
        setMatches(mockReceivedMatches);
        setUseMockData(true);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [filter]);

  // Fetch wallet info for showing balance when accepting
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

  const pendingCount = matches.filter(m => m.status === 'pending').length;

  // Open accept modal
  const openAcceptModal = (match: Match, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAcceptModal({ isOpen: true, match });
  };

  // Open reject modal
  const openRejectModal = (match: Match, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRejectModal({ isOpen: true, match });
  };

  // Confirm accept
  const handleAcceptConfirm = async () => {
    if (!acceptModal.match) return;
    const matchId = acceptModal.match.id;
    const requesterName = acceptModal.match.requester.name;

    setActionLoading(true);

    try {
      if (!useMockData) {
        await matchesApi.accept(matchId);
      }

      // Close modal first
      setAcceptModal({ isOpen: false, match: null });
      setActionLoading(false);

      // Start success animation
      setAnimatingCards({ ...animatingCards, [matchId]: 'accept' });

      // Update match after animation
      setTimeout(() => {
        setMatches(matches.map(m =>
          m.id === matchId ? { ...m, status: 'accepted' as MatchStatus } : m
        ));
        setAnimatingCards(prev => ({ ...prev, [matchId]: null }));
        showSuccess('Solicitud aceptada', `Has aceptado la solicitud de ${requesterName}`);
      }, 400);

    } catch (err) {
      setActionLoading(false);
      setAcceptModal({ isOpen: false, match: null });
      showError('Error', getErrorMessage(err, 'No se pudo aceptar la solicitud'));
    }
  };

  // Confirm reject
  const handleRejectConfirm = async () => {
    if (!rejectModal.match) return;
    const matchId = rejectModal.match.id;
    const requesterName = rejectModal.match.requester.name;

    setActionLoading(true);

    try {
      if (!useMockData) {
        await matchesApi.reject(matchId);
      }

      // Close modal first
      setRejectModal({ isOpen: false, match: null });
      setActionLoading(false);

      // Start reject animation
      setAnimatingCards({ ...animatingCards, [matchId]: 'reject' });

      // Update match after animation
      setTimeout(() => {
        setMatches(matches.map(m =>
          m.id === matchId ? { ...m, status: 'rejected' as MatchStatus } : m
        ));
        setAnimatingCards(prev => ({ ...prev, [matchId]: null }));
        showSuccess('Solicitud rechazada', `Has rechazado la solicitud de ${requesterName}`);
      }, 400);

    } catch (err) {
      setActionLoading(false);
      setRejectModal({ isOpen: false, match: null });
      showError('Error', getErrorMessage(err, 'No se pudo rechazar la solicitud'));
    }
  };

  const getAvatarSrc = (avatar?: string) => {
    if (!avatar) return '/images/user_ana.png';
    if (avatar.startsWith('/images/')) return avatar;
    return getAvatarUrl(avatar);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner spinner-lg mx-auto mb-4" />
          <div className="text-gray-500">Cargando mensajes...</div>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
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
            className="flex-1 py-3 text-center font-medium text-blue-600 border-b-2 border-blue-600 relative"
          >
            Recibidas
            {pendingCount > 0 && (
              <span className="absolute top-2 right-1/4 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </Link>
          <Link
            href="/matches/sent"
            className="flex-1 py-3 text-center font-medium text-gray-500 hover:text-gray-700"
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </div>
          <h2 className="font-bold text-xl text-gray-900 mb-2">Sin solicitudes</h2>
          <p className="text-gray-500 text-center max-w-xs">
            {filter === 'all'
              ? 'Cuando alguien quiera unirse a tus experiencias, aparecerá aquí'
              : `No tienes solicitudes ${statusConfig[filter as MatchStatus].label.toLowerCase()}s`}
          </p>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {filteredMatches.map((match) => {
            const config = statusConfig[match.status];
            const animationState = animatingCards[match.id];
            const isAnimating = animationState !== null && animationState !== undefined;

            return (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className={`
                  bg-white rounded-2xl overflow-hidden shadow-sm block hover:shadow-md transition-all active:scale-[0.98]
                  ${isAnimating ? 'transform transition-all duration-400' : ''}
                  ${animationState === 'accept' ? 'scale-95 opacity-0 bg-emerald-50 border-2 border-emerald-300' : ''}
                  ${animationState === 'reject' ? 'scale-95 opacity-0 bg-red-50 border-2 border-red-300' : ''}
                `}
              >
                <div className="p-4">
                  {/* Top row: Avatar, name, time */}
                  <div className="flex items-start gap-3">
                    {/* Avatar with online indicator */}
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-white shadow-md">
                        <img
                          src={getAvatarSrc(match.requester.avatar)}
                          alt={match.requester.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {match.status === 'pending' && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center">
                          <span className="text-white text-[10px]">!</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-semibold ${match.unreadCount && match.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                            {match.requester.name}
                          </h3>
                          {match.requester.verified && (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-500">
                              <path fillRule="evenodd" d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">{formatTimeAgo(match.lastMessage?.createdAt || match.createdAt)}</span>
                          {/* Unread badge */}
                          {match.unreadCount && match.unreadCount > 0 && (
                            <span className="w-5 h-5 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                              {match.unreadCount > 9 ? '9+' : match.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Experience */}
                      <p className="text-xs text-blue-600 font-medium mt-0.5 truncate">
                        {match.experience.title}
                      </p>

                      {/* Last message preview */}
                      {match.lastMessage ? (
                        <p className={`text-sm mt-1.5 line-clamp-1 ${match.unreadCount && match.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                          {match.lastMessage.content}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400 mt-1.5 italic">
                          Sin mensajes aun
                        </p>
                      )}

                      {/* Location */}
                      {match.requester.city && (
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                            <path fillRule="evenodd" d="m7.539 14.841.003.003.002.002a.755.755 0 0 0 .912 0l.002-.002.003-.003.012-.009a5.57 5.57 0 0 0 .19-.153 15.588 15.588 0 0 0 2.046-2.082c1.101-1.362 2.291-3.342 2.291-5.597A5 5 0 0 0 3 7c0 2.255 1.19 4.235 2.292 5.597a15.591 15.591 0 0 0 2.046 2.082 8.916 8.916 0 0 0 .189.153l.012.01ZM8 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" clipRule="evenodd" />
                          </svg>
                          {match.requester.city}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bottom row: Status and actions */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Status badge */}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                        {config.label}
                      </span>

                      {/* Message count */}
                      {match._count?.messages && match._count.messages > 0 && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                            <path d="M1 8.74c0 .983.713 1.825 1.69 1.943.764.092 1.534.164 2.31.216v2.351a.75.75 0 0 0 1.28.53l2.51-2.51c.182-.181.427-.29.686-.31a44.74 44.74 0 0 0 3.834-.449C14.287 10.565 15 9.723 15 8.74V4.26c0-.983-.713-1.825-1.69-1.943a44.507 44.507 0 0 0-10.62 0C1.713 2.435 1 3.277 1 4.26v4.482Z" />
                          </svg>
                          {match._count.messages}
                        </span>
                      )}
                    </div>

                    {/* Action buttons for pending */}
                    {match.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => openRejectModal(match, e)}
                          className="h-10 px-4 flex items-center justify-center gap-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all font-medium text-sm"
                          title="Rechazar solicitud"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                          </svg>
                          Rechazar
                        </button>
                        <button
                          onClick={(e) => openAcceptModal(match, e)}
                          className="h-10 px-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md font-medium text-sm"
                          title="Aceptar solicitud"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                          </svg>
                          Aceptar
                        </button>
                      </div>
                    )}

                    {/* Arrow for non-pending */}
                    {match.status !== 'pending' && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-300">
                        <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Accept Confirmation Modal */}
      <ConfirmModal
        isOpen={acceptModal.isOpen}
        onClose={() => setAcceptModal({ isOpen: false, match: null })}
        onConfirm={handleAcceptConfirm}
        title="Aceptar solicitud"
        variant="success"
        confirmText="Aceptar"
        cancelText="Cancelar"
        isLoading={actionLoading}
        message={
          <div className="space-y-3">
            {acceptModal.match && (
              <>
                <p>
                  Vas a aceptar la solicitud de <strong className="text-gray-900">{acceptModal.match.requester.name}</strong> para la experiencia:
                </p>
                <div className="bg-gray-50 rounded-lg p-3 text-left">
                  <p className="font-medium text-gray-900">{acceptModal.match.experience.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{acceptModal.match.experience.city}</p>
                </div>
                {/* Wallet info */}
                {walletInfo && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-600">
                        <path d="M1 4.25a3.733 3.733 0 0 1 2.25-.75h13.5c.844 0 1.623.279 2.25.75A2.25 2.25 0 0 0 16.75 2H3.25A2.25 2.25 0 0 0 1 4.25ZM1 7.25a3.733 3.733 0 0 1 2.25-.75h13.5c.844 0 1.623.279 2.25.75A2.25 2.25 0 0 0 16.75 5H3.25A2.25 2.25 0 0 0 1 7.25ZM7 8a1 1 0 0 1 1 1 2 2 0 1 0 4 0 1 1 0 0 1 1-1h3.75A2.25 2.25 0 0 1 19 10.25v5.5A2.25 2.25 0 0 1 16.75 18H3.25A2.25 2.25 0 0 1 1 15.75v-5.5A2.25 2.25 0 0 1 3.25 8H7Z" />
                      </svg>
                      <span className="font-medium text-emerald-800 text-sm">Informacion del monedero</span>
                    </div>
                    <p className="text-xs text-emerald-700">
                      Saldo actual: <strong>{walletInfo.balance.toFixed(2)} EUR</strong>
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">
                      Al completar la experiencia se cobrara una comision de {walletInfo.platformFee} EUR.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        }
      />

      {/* Reject Confirmation Modal */}
      <ConfirmModal
        isOpen={rejectModal.isOpen}
        onClose={() => setRejectModal({ isOpen: false, match: null })}
        onConfirm={handleRejectConfirm}
        title="Rechazar solicitud"
        variant="danger"
        confirmText="Rechazar"
        cancelText="Cancelar"
        isLoading={actionLoading}
        message={
          <div className="space-y-3">
            {rejectModal.match && (
              <>
                <p>
                  Vas a rechazar la solicitud de <strong className="text-gray-900">{rejectModal.match.requester.name}</strong> para la experiencia:
                </p>
                <div className="bg-gray-50 rounded-lg p-3 text-left">
                  <p className="font-medium text-gray-900">{rejectModal.match.experience.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{rejectModal.match.experience.city}</p>
                </div>
                <p className="text-xs text-gray-500">
                  El usuario sera notificado de tu decision. Esta accion no se puede deshacer.
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
