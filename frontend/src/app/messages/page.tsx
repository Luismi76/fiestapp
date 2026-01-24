'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { matchesApi } from '@/lib/api';
import { Match, MatchStatus } from '@/types/match';
import { getAvatarUrl, getUploadUrl } from '@/lib/utils';
import MainLayout from '@/components/MainLayout';
import ConfirmModal from '@/components/ConfirmModal';
import { useToast } from '@/components/ui/Toast';

// Icons
const InboxIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
  </svg>
);

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
  </svg>
);

const VerifiedIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-secondary">
    <path fillRule="evenodd" d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[#A89880]">
    <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
  </svg>
);

type TabType = 'received' | 'sent';

const statusConfig: Record<MatchStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: 'Pendiente', bg: 'bg-[var(--color-warning-bg)]', text: 'text-accent', dot: 'status-pending' },
  accepted: { label: 'Aceptada', bg: 'bg-[var(--color-success-bg)]', text: 'text-emerald', dot: 'status-accepted' },
  rejected: { label: 'Rechazada', bg: 'bg-[var(--color-error-bg)]', text: 'text-primary', dot: 'status-rejected' },
  cancelled: { label: 'Cancelada', bg: 'bg-[var(--surface-tile)]', text: 'text-[#8B7355]', dot: 'bg-[#A89880]' },
  completed: { label: 'Completada', bg: 'bg-[var(--color-info-bg)]', text: 'text-secondary', dot: 'status-completed' },
};

export default function MessagesPage() {
  const { success: showSuccess, error: showError } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('received');
  const [receivedMatches, setReceivedMatches] = useState<Match[]>([]);
  const [sentMatches, setSentMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MatchStatus | 'all'>('all');

  // Modal states
  const [acceptModal, setAcceptModal] = useState<{ isOpen: boolean; match: Match | null }>({ isOpen: false, match: null });
  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean; match: Match | null }>({ isOpen: false, match: null });
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; match: Match | null }>({ isOpen: false, match: null });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true);
      try {
        const [received, sent] = await Promise.all([
          matchesApi.getReceived().catch(() => []),
          matchesApi.getSent().catch(() => []),
        ]);
        setReceivedMatches(received || []);
        setSentMatches(sent || []);
      } catch (err) {
        console.error('Error fetching matches:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  const matches = activeTab === 'received' ? receivedMatches : sentMatches;
  const filteredMatches = filter === 'all' ? matches : matches.filter(m => m.status === filter);

  const pendingReceivedCount = receivedMatches.filter(m => m.status === 'pending').length;
  const unreadCount = [...receivedMatches, ...sentMatches].reduce((acc, m) => acc + (m.unreadCount || 0), 0);

  // Actions
  const handleAccept = async () => {
    if (!acceptModal.match) return;
    setActionLoading(true);
    try {
      await matchesApi.accept(acceptModal.match.id);
      setReceivedMatches(prev => prev.map(m =>
        m.id === acceptModal.match!.id ? { ...m, status: 'accepted' as MatchStatus } : m
      ));
      showSuccess('Solicitud aceptada', `Has aceptado la solicitud de ${acceptModal.match.requester.name}`);
    } catch (err: any) {
      showError('Error', err?.response?.data?.message || 'No se pudo aceptar');
    } finally {
      setActionLoading(false);
      setAcceptModal({ isOpen: false, match: null });
    }
  };

  const handleReject = async () => {
    if (!rejectModal.match) return;
    setActionLoading(true);
    try {
      await matchesApi.reject(rejectModal.match.id);
      setReceivedMatches(prev => prev.map(m =>
        m.id === rejectModal.match!.id ? { ...m, status: 'rejected' as MatchStatus } : m
      ));
      showSuccess('Solicitud rechazada', `Has rechazado la solicitud de ${rejectModal.match.requester.name}`);
    } catch (err: any) {
      showError('Error', err?.response?.data?.message || 'No se pudo rechazar');
    } finally {
      setActionLoading(false);
      setRejectModal({ isOpen: false, match: null });
    }
  };

  const handleCancel = async () => {
    if (!cancelModal.match) return;
    setActionLoading(true);
    try {
      await matchesApi.cancel(cancelModal.match.id);
      setSentMatches(prev => prev.map(m =>
        m.id === cancelModal.match!.id ? { ...m, status: 'cancelled' as MatchStatus } : m
      ));
      showSuccess('Solicitud cancelada', 'Tu solicitud ha sido cancelada');
    } catch (err: any) {
      showError('Error', err?.response?.data?.message || 'No se pudo cancelar');
    } finally {
      setActionLoading(false);
      setCancelModal({ isOpen: false, match: null });
    }
  };

  // Helpers
  const getAvatarSrc = (avatar?: string) => {
    if (!avatar) return '/images/placeholder-user.jpg';
    if (avatar.startsWith('/images/')) return avatar;
    return getAvatarUrl(avatar);
  };

  const getImageSrc = (photos?: string[]) => {
    if (!photos || photos.length === 0) return null;
    const photo = photos[0];
    if (photo.startsWith('/images/')) return photo;
    return getUploadUrl(photo);
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

  const getContactPerson = (match: Match) => {
    return activeTab === 'received' ? match.requester : match.host;
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center pattern-festive">
          <div className="text-center">
            <div className="spinner spinner-lg mx-auto mb-4" />
            <p className="text-[#8B7355]">Cargando conversaciones...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen pb-24 md:pb-8">
        {/* Hero */}
        <header className="pattern-festive relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-4 right-4 w-32 h-32 bg-accent/30 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/20 rounded-full blur-3xl" />
          </div>

          <div className="relative px-4 py-6">
            <h1 className="font-display text-2xl text-[#1A1410]">
              Mensajes
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-[#8B7355] mt-1">
                {unreadCount} {unreadCount === 1 ? 'mensaje sin leer' : 'mensajes sin leer'}
              </p>
            )}
          </div>

          {/* Tabs - Accessible */}
          <div role="tablist" aria-label="Tipo de mensajes" className="tabs mx-4 mb-4">
            <button
              role="tab"
              aria-selected={activeTab === 'received'}
              aria-controls="tab-panel-received"
              onClick={() => { setActiveTab('received'); setFilter('all'); }}
              className={`tab ${activeTab === 'received' ? 'active' : ''} flex items-center justify-center gap-2 ripple ripple-dark`}
            >
              <InboxIcon />
              <span>Recibidas</span>
              {pendingReceivedCount > 0 && (
                <span className="w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {pendingReceivedCount > 9 ? '9+' : pendingReceivedCount}
                </span>
              )}
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'sent'}
              aria-controls="tab-panel-sent"
              onClick={() => { setActiveTab('sent'); setFilter('all'); }}
              className={`tab ${activeTab === 'sent' ? 'active' : ''} flex items-center justify-center gap-2 ripple ripple-dark`}
            >
              <SendIcon />
              <span>Enviadas</span>
            </button>
          </div>
        </header>

        {/* Filters - Accessible with touch targets */}
        <div
          role="tablist"
          aria-label="Filtrar por estado"
          className="px-4 py-3 overflow-x-auto scrollbar-hide bg-white border-b border-primary/10"
        >
          <div className="flex gap-2">
            {(['all', 'pending', 'accepted', 'completed'] as const).map((status) => (
              <button
                key={status}
                role="tab"
                aria-selected={filter === status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold whitespace-nowrap transition-all ripple ${
                  filter === status
                    ? 'gradient-sunset text-white shadow-md'
                    : 'bg-[var(--surface-tile)] text-[#8B7355] hover:text-[#1A1410]'
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

        {/* List */}
        {filteredMatches.length === 0 ? (
          <div className="empty-state">
            <div className="w-20 h-20 rounded-full gradient-sunset flex items-center justify-center text-white mb-6">
              {activeTab === 'received' ? (
                <InboxIcon />
              ) : (
                <SendIcon />
              )}
            </div>
            <h2 className="empty-state-title">
              {activeTab === 'received' ? 'Sin solicitudes recibidas' : 'Sin solicitudes enviadas'}
            </h2>
            <p className="empty-state-text">
              {activeTab === 'received'
                ? 'Cuando alguien quiera unirse a tus experiencias, aparecerá aquí'
                : 'Explora experiencias y envía solicitudes para conectar'}
            </p>
            <Link href="/experiences" className="btn btn-primary">
              Explorar experiencias
            </Link>
          </div>
        ) : (
          <div className="p-4 space-y-3 stagger-children">
            {filteredMatches.map((match) => {
              const config = statusConfig[match.status];
              const person = getContactPerson(match);
              const imageSrc = activeTab === 'sent' ? getImageSrc(match.experience.photos) : null;

              return (
                <Link
                  key={match.id}
                  href={`/matches/${match.id}`}
                  className="card block hover:shadow-lg transition-all active:scale-[0.99]"
                >
                  <div className="p-4">
                    <div className="flex gap-3">
                      {/* Avatar or Image */}
                      <div className="relative flex-shrink-0">
                        {activeTab === 'sent' && imageSrc ? (
                          <div className="w-14 h-14 rounded-xl overflow-hidden">
                            <img src={imageSrc} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-white shadow-sm">
                            <img
                              src={getAvatarSrc(person.avatar)}
                              alt={person.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        {match.status === 'pending' && activeTab === 'received' && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full border-2 border-white" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-semibold text-[#1A1410] truncate">
                                {person.name}
                              </h3>
                              {person.verified && <VerifiedIcon />}
                            </div>
                            <p className="text-xs text-primary font-semibold truncate mt-0.5">
                              {match.experience.title}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-[#A89880]">
                              {formatTimeAgo(match.lastMessage?.createdAt || match.createdAt)}
                            </span>
                            {match.unreadCount && match.unreadCount > 0 && (
                              <span className="w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                {match.unreadCount > 9 ? '9+' : match.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Last message */}
                        <p className={`text-sm mt-1.5 line-clamp-1 ${
                          match.unreadCount && match.unreadCount > 0 ? 'text-[#1A1410] font-medium' : 'text-[#8B7355]'
                        }`}>
                          {match.lastMessage?.content || 'Sin mensajes aún'}
                        </p>

                        {/* Bottom row */}
                        <div className="flex items-center justify-between mt-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
                            <span className={`w-2 h-2 rounded-full ${config.dot}`} />
                            {config.label}
                          </span>

                          {/* Actions - Touch-friendly */}
                          {match.status === 'pending' && activeTab === 'received' ? (
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRejectModal({ isOpen: true, match }); }}
                                className="h-11 w-11 flex items-center justify-center rounded-full bg-[var(--surface-tile)] text-[#8B7355] hover:bg-primary/10 hover:text-primary transition-colors ripple ripple-dark"
                                aria-label="Rechazar solicitud"
                              >
                                <XIcon />
                              </button>
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAcceptModal({ isOpen: true, match }); }}
                                className="h-11 w-11 flex items-center justify-center rounded-full bg-emerald text-white hover:opacity-90 transition-opacity ripple"
                                aria-label="Aceptar solicitud"
                              >
                                <CheckIcon />
                              </button>
                            </div>
                          ) : match.status === 'pending' && activeTab === 'sent' ? (
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCancelModal({ isOpen: true, match }); }}
                              className="px-3 py-2 min-h-[44px] text-xs text-primary font-semibold hover:text-primary-dark hover:bg-primary/5 rounded-lg transition-colors"
                            >
                              Cancelar
                            </button>
                          ) : (
                            <ChevronRightIcon />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Accept Modal */}
        <ConfirmModal
          isOpen={acceptModal.isOpen}
          onClose={() => setAcceptModal({ isOpen: false, match: null })}
          onConfirm={handleAccept}
          title="Aceptar solicitud"
          variant="success"
          confirmText="Aceptar"
          cancelText="Cancelar"
          isLoading={actionLoading}
          message={acceptModal.match && (
            <div className="space-y-3">
              <p className="text-[#8B7355]">
                Vas a aceptar la solicitud de <strong className="text-[#1A1410]">{acceptModal.match.requester.name}</strong> para:
              </p>
              <div className="card p-3">
                <p className="font-semibold text-[#1A1410]">{acceptModal.match.experience.title}</p>
                <p className="text-xs text-[#8B7355] mt-1">{acceptModal.match.experience.city}</p>
              </div>
            </div>
          )}
        />

        {/* Reject Modal */}
        <ConfirmModal
          isOpen={rejectModal.isOpen}
          onClose={() => setRejectModal({ isOpen: false, match: null })}
          onConfirm={handleReject}
          title="Rechazar solicitud"
          variant="danger"
          confirmText="Rechazar"
          cancelText="Volver"
          isLoading={actionLoading}
          message={rejectModal.match && (
            <div className="space-y-3">
              <p className="text-[#8B7355]">
                Vas a rechazar la solicitud de <strong className="text-[#1A1410]">{rejectModal.match.requester.name}</strong>.
              </p>
              <p className="text-xs text-[#A89880]">
                El usuario será notificado. Esta acción no se puede deshacer.
              </p>
            </div>
          )}
        />

        {/* Cancel Modal */}
        <ConfirmModal
          isOpen={cancelModal.isOpen}
          onClose={() => setCancelModal({ isOpen: false, match: null })}
          onConfirm={handleCancel}
          title="Cancelar solicitud"
          variant="warning"
          confirmText="Cancelar solicitud"
          cancelText="Volver"
          isLoading={actionLoading}
          message={cancelModal.match && (
            <div className="space-y-3">
              <p className="text-[#8B7355]">Vas a cancelar tu solicitud para:</p>
              <div className="card p-3">
                <p className="font-semibold text-[#1A1410]">{cancelModal.match.experience.title}</p>
                <p className="text-xs text-[#8B7355] mt-1">
                  Anfitrión: {cancelModal.match.host.name}
                </p>
              </div>
            </div>
          )}
        />
      </div>
    </MainLayout>
  );
}
