'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { matchesApi, reviewsApi, paymentsApi, PaymentStatus } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { MatchDetail, MatchStatus, Message } from '@/types/match';
import { CanReviewResponse } from '@/types/review';
import ReviewForm from '@/components/ReviewForm';
import PaymentModal from '@/components/PaymentModal';
import { getAvatarUrl } from '@/lib/utils';

// Mock match details for fallback
const mockMatchDetails: Record<string, MatchDetail> = {
  '1': {
    id: '1',
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    experienceId: '1',
    requesterId: '10',
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
      id: '10',
      name: 'Ana García',
      avatar: '/images/user_ana.png',
      verified: true,
      city: 'Barcelona',
    },
    host: {
      id: '1',
      name: 'María García',
      avatar: '/images/user_maria.png',
      verified: true,
      city: 'Sevilla',
    },
    messages: [
      {
        id: 'm1',
        matchId: '1',
        senderId: '10',
        content: '¡Hola María! Me encantaría vivir la Feria contigo.',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        read: true,
        sender: { id: '10', name: 'Ana García', avatar: '/images/user_ana.png' },
      },
    ],
  },
  '2': {
    id: '2',
    status: 'accepted',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    experienceId: '2',
    requesterId: '11',
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
      id: '11',
      name: 'Carlos Ruiz',
      avatar: '/images/user_carlos.png',
      verified: false,
      city: 'Madrid',
    },
    host: {
      id: '2',
      name: 'Carlos Martínez',
      avatar: '/images/user_carlos.png',
      verified: true,
      city: 'Pamplona',
    },
    messages: [
      {
        id: 'm2',
        matchId: '2',
        senderId: '11',
        content: 'Hola Carlos! Me interesa mucho tu experiencia.',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        read: true,
        sender: { id: '11', name: 'Carlos Ruiz', avatar: '/images/user_carlos.png' },
      },
      {
        id: 'm3',
        matchId: '2',
        senderId: '2',
        content: '¡Hola! Genial, será un placer. ¿Cuándo vienes a Pamplona?',
        createdAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
        read: true,
        sender: { id: '2', name: 'Carlos Martínez', avatar: '/images/user_carlos.png' },
      },
      {
        id: 'm4',
        matchId: '2',
        senderId: '11',
        content: 'Llegaré el jueves por la tarde. ¿Quedamos el viernes temprano?',
        createdAt: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
        read: true,
        sender: { id: '11', name: 'Carlos Ruiz', avatar: '/images/user_carlos.png' },
      },
      {
        id: 'm5',
        matchId: '2',
        senderId: '2',
        content: 'Perfecto! Nos vemos el viernes a las 7am en la Plaza del Castillo.',
        createdAt: new Date(Date.now() - 21 * 60 * 60 * 1000).toISOString(),
        read: true,
        sender: { id: '2', name: 'Carlos Martínez', avatar: '/images/user_carlos.png' },
      },
      {
        id: 'm6',
        matchId: '2',
        senderId: '11',
        content: '¡Genial! Ahí estaré. Muchas gracias!',
        createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
        read: false,
        sender: { id: '11', name: 'Carlos Ruiz', avatar: '/images/user_carlos.png' },
      },
    ],
  },
  '3': {
    id: '3',
    status: 'pending',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    experienceId: '3',
    requesterId: '12',
    hostId: '3',
    experience: {
      id: '3',
      title: 'Mascletà y paella valenciana',
      city: 'Valencia',
      type: 'pago',
      price: 35,
      photos: ['/images/las_fallas.png'],
      festival: { id: '3', name: 'Las Fallas', city: 'Valencia' },
    } as any,
    requester: {
      id: '12',
      name: 'Pierre Dubois',
      avatar: '/images/user_pedro.png',
      verified: true,
      city: 'Lyon',
    },
    host: {
      id: '3',
      name: 'Laura Pérez',
      avatar: '/images/user_laura.png',
      verified: true,
      city: 'Valencia',
    },
    messages: [
      {
        id: 'm7',
        matchId: '3',
        senderId: '12',
        content: 'Bonjour! Somos 3 amigos de Lyon. ¿Es posible reservar para los tres?',
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        read: true,
        sender: { id: '12', name: 'Pierre Dubois', avatar: '/images/user_pedro.png' },
      },
      {
        id: 'm8',
        matchId: '3',
        senderId: '3',
        content: '¡Hola Pierre! Sí, claro. Tengo sitio para 4 personas.',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        read: true,
        sender: { id: '3', name: 'Laura Pérez', avatar: '/images/user_laura.png' },
      },
    ],
  },
  '10': {
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
    messages: [
      {
        id: 'm9',
        matchId: '10',
        senderId: 'me',
        content: '¡Hola María! Vi tu experiencia y me encantaría participar.',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        read: true,
        sender: { id: 'me', name: 'Yo' },
      },
      {
        id: 'm10',
        matchId: '10',
        senderId: '1',
        content: '¡Hola! Me alegra que te interese. ¿Para qué fechas vienes a Sevilla?',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        read: true,
        sender: { id: '1', name: 'María García', avatar: '/images/user_maria.png' },
      },
    ],
  },
};

const statusConfig: Record<MatchStatus, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pendiente', bg: 'bg-amber-100', text: 'text-amber-700' },
  accepted: { label: 'Aceptada', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  rejected: { label: 'Rechazada', bg: 'bg-red-100', text: 'text-red-700' },
  cancelled: { label: 'Cancelada', bg: 'bg-gray-100', text: 'text-gray-600' },
  completed: { label: 'Completada', bg: 'bg-blue-100', text: 'text-blue-700' },
};

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [useMockData, setUseMockData] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Review state
  const [canReviewData, setCanReviewData] = useState<CanReviewResponse | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Payment state
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // For mock data, assume user is the host for IDs 1-3 and requester for IDs 10+
  const mockUserId = match ? (parseInt(match.id) < 10 ? match.hostId : 'me') : null;
  const isHost = useMockData ? (match ? parseInt(match.id) < 10 : false) : user?.id === match?.hostId;
  const otherUser = isHost ? match?.requester : match?.host;

  useEffect(() => {
    const fetchMatch = async () => {
      const id = params.id as string;

      try {
        const data = await matchesApi.getById(id);
        setMatch(data);
        setUseMockData(false);

        // Check payment status
        if (data.status === 'pending' || data.status === 'accepted') {
          try {
            const payment = await paymentsApi.getPaymentStatus(id);
            setPaymentStatus(payment);
          } catch {
            // Ignore payment status errors
          }
        }

        if (data.status === 'completed') {
          const reviewCheck = await reviewsApi.canReview(data.experienceId);
          setCanReviewData(reviewCheck);
        }
      } catch {
        if (mockMatchDetails[id]) {
          setMatch(mockMatchDetails[id]);
          setUseMockData(true);
        } else {
          setError('No se pudo cargar la conversación');
        }
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchMatch();
    }
  }, [params.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [match?.messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !match) return;

    if (useMockData) {
      const mockMessage: Message = {
        id: `m${Date.now()}`,
        matchId: match.id,
        senderId: mockUserId || 'me',
        content: newMessage.trim(),
        createdAt: new Date().toISOString(),
        read: false,
        sender: { id: mockUserId || 'me', name: isHost ? match.host.name : (match.requester.name || 'Yo'), avatar: isHost ? match.host.avatar : match.requester.avatar },
      };
      setMatch({
        ...match,
        messages: [...match.messages, mockMessage],
      });
      setNewMessage('');
      return;
    }

    setSending(true);
    try {
      const message = await matchesApi.sendMessage(match.id, newMessage.trim());
      setMatch({
        ...match,
        messages: [...match.messages, message],
      });
      setNewMessage('');
    } catch {
      setError('No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  const handleAccept = async () => {
    if (!match) return;

    if (useMockData) {
      setMatch({ ...match, status: 'accepted' });
      return;
    }

    try {
      await matchesApi.accept(match.id);
      setMatch({ ...match, status: 'accepted' });
    } catch {
      setError('No se pudo aceptar la solicitud');
    }
  };

  const handleReject = async () => {
    if (!match) return;

    if (useMockData) {
      setMatch({ ...match, status: 'rejected' });
      return;
    }

    try {
      await matchesApi.reject(match.id);
      setMatch({ ...match, status: 'rejected' });
    } catch {
      setError('No se pudo rechazar la solicitud');
    }
  };

  const handleCancel = async () => {
    if (!match) return;
    if (!confirm('¿Estás seguro de que quieres cancelar?')) return;

    if (useMockData) {
      setMatch({ ...match, status: 'cancelled' });
      return;
    }

    try {
      await matchesApi.cancel(match.id);
      setMatch({ ...match, status: 'cancelled' });
    } catch {
      setError('No se pudo cancelar');
    }
  };

  const handleComplete = async () => {
    if (!match) return;

    if (useMockData) {
      setMatch({ ...match, status: 'completed' });
      setCanReviewData({
        canReview: true,
        targetUser: { id: otherUser?.id || '1', name: otherUser?.name || 'Usuario' },
      });
      return;
    }

    try {
      await matchesApi.complete(match.id);
      setMatch({ ...match, status: 'completed' });

      const reviewCheck = await reviewsApi.canReview(match.experienceId);
      setCanReviewData(reviewCheck);
    } catch {
      setError('No se pudo marcar como completada');
    }
  };

  const getAvatarSrc = (avatar?: string) => {
    if (!avatar) return '/images/user_ana.png';
    if (avatar.startsWith('/images/')) return avatar;
    return getAvatarUrl(avatar);
  };

  const formatMessageTime = (date: string) => {
    return new Date(date).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner spinner-lg mx-auto mb-4" />
          <div className="text-gray-500">Cargando conversación...</div>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="flex items-center px-4 h-14">
            <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <span className="font-semibold ml-2">Error</span>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center px-6 py-20">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-red-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h2 className="font-bold text-xl text-gray-900 mb-2">No encontrado</h2>
          <p className="text-gray-500 text-center mb-6">{error}</p>
          <Link href="/matches/received" className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-full hover:bg-blue-600 transition-colors">
            Volver a mensajes
          </Link>
        </div>
      </div>
    );
  }

  const canSendMessages = match.status !== 'rejected' && match.status !== 'cancelled';
  const currentUserId = useMockData ? mockUserId : user?.id;
  const config = statusConfig[match.status];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="flex items-center gap-3 px-4 h-16">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>

          {/* User info */}
          <Link href={`/profile/${otherUser?.id}`} className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-gray-100 flex-shrink-0">
              <img
                src={getAvatarSrc(otherUser?.avatar)}
                alt={otherUser?.name || 'Usuario'}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                <span className="truncate">{otherUser?.name}</span>
                {otherUser?.verified && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-500 flex-shrink-0">
                    <path fillRule="evenodd" d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">{otherUser?.city}</p>
            </div>
          </Link>

          {/* Status badge */}
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} flex-shrink-0`}>
            {config.label}
          </span>
        </div>
      </header>

      {/* Mock data indicator */}
      {useMockData && (
        <div className="bg-amber-50 text-amber-700 text-xs px-4 py-2 text-center flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
          </svg>
          Datos de demostración
        </div>
      )}

      {/* Experience Card */}
      <Link
        href={`/experiences/${match.experience.id}`}
        className="mx-4 mt-4 bg-white rounded-2xl shadow-sm overflow-hidden flex items-center gap-3 hover:shadow-md transition-shadow"
      >
        <div className="w-16 h-16 flex-shrink-0 relative">
          {match.experience.photos && match.experience.photos[0] ? (
            <img
              src={match.experience.photos[0].startsWith('/images/') ? match.experience.photos[0] : `/uploads/${match.experience.photos[0]}`}
              alt={match.experience.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
              <span className="text-2xl text-white/50">🎭</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 py-2">
          <h3 className="font-medium text-sm text-gray-900 truncate">{match.experience.title}</h3>
          <p className="text-xs text-blue-600">{match.experience.festival?.name || 'Festividad'}</p>
        </div>
        <div className="pr-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-300">
            <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </div>
      </Link>

      {/* Action buttons based on status */}
      {match.status === 'pending' && isHost && (
        <div className="mx-4 mt-4 space-y-3">
          {/* Payment status for host */}
          {paymentStatus?.requiresPayment && (
            <div className={`rounded-xl p-4 ${paymentStatus.paymentStatus === 'held' ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${paymentStatus.paymentStatus === 'held' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                  {paymentStatus.paymentStatus === 'held' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-emerald-600">
                      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-amber-600">
                      <path d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div>
                  {paymentStatus.paymentStatus === 'held' ? (
                    <>
                      <p className="font-medium text-emerald-800">Pago recibido</p>
                      <p className="text-sm text-emerald-600">
                        El viajero ha pagado {paymentStatus.amount}€. Puedes aceptar la solicitud.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-amber-800">Esperando pago</p>
                      <p className="text-sm text-amber-600">
                        El viajero debe pagar {paymentStatus.amount}€ antes de que puedas aceptar.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAccept}
              disabled={paymentStatus?.requiresPayment && paymentStatus.paymentStatus !== 'held'}
              className="flex-1 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
              </svg>
              Aceptar
            </button>
            <button
              onClick={handleReject}
              className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
              Rechazar
            </button>
          </div>
        </div>
      )}

      {match.status === 'pending' && !isHost && (
        <div className="mx-4 mt-4 space-y-3">
          {/* Payment section for requester */}
          {paymentStatus?.requiresPayment && paymentStatus.paymentStatus !== 'held' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-amber-600">
                    <path d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-amber-800">Pago pendiente</p>
                  <p className="text-sm text-amber-600">
                    Completa el pago de {paymentStatus.amount}€ para que el anfitrión pueda aceptar
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M4.5 3.75a3 3 0 0 0-3 3v.75h21v-.75a3 3 0 0 0-3-3h-15Z" />
                  <path fillRule="evenodd" d="M1.5 9.75v6.75a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3v-6.75H1.5Zm6 3.75a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 0 1.5h-6a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
                </svg>
                Pagar {paymentStatus.amount}€
              </button>
            </div>
          )}

          {/* Payment confirmed */}
          {paymentStatus?.paymentStatus === 'held' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-emerald-600">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-emerald-800">Pago confirmado</p>
                  <p className="text-sm text-emerald-600">
                    Tu pago de {paymentStatus.amount}€ está retenido. Esperando respuesta del anfitrión.
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleCancel}
            className="w-full py-3 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-colors"
          >
            Cancelar solicitud
          </button>
        </div>
      )}

      {match.status === 'accepted' && (
        <div className="mx-4 mt-4 flex gap-2">
          {isHost && (
            <button
              onClick={handleComplete}
              className="flex-1 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors shadow-md flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
              </svg>
              Marcar completada
            </button>
          )}
          <button
            onClick={handleCancel}
            className={`${isHost ? 'flex-1' : 'w-full'} py-3 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-colors`}
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Completed - Review prompt */}
      {match.status === 'completed' && canReviewData?.canReview && !reviewSubmitted && (
        <div className="mx-4 mt-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-emerald-600">
                <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-emerald-800">¡Experiencia completada!</h3>
              <p className="text-sm text-emerald-600">
                Deja una reseña para {canReviewData.targetUser?.name}
              </p>
            </div>
            <button
              onClick={() => setShowReviewForm(true)}
              className="px-4 py-2 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors shadow-md"
            >
              Reseñar
            </button>
          </div>
        </div>
      )}

      {/* Completed - Already reviewed */}
      {match.status === 'completed' && (canReviewData?.canReview === false || reviewSubmitted) && (
        <div className="mx-4 mt-4 bg-gray-50 border border-gray-200 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-gray-500">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-700">Experiencia completada</h3>
              <p className="text-sm text-gray-500">
                {reviewSubmitted ? '¡Gracias por tu reseña!' : canReviewData?.reason || 'Ya has dejado tu reseña'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {match.messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">No hay mensajes aún</p>
            <p className="text-gray-400 text-xs mt-1">¡Inicia la conversación!</p>
          </div>
        ) : (
          match.messages.map((message, index) => {
            const isMe = message.senderId === currentUserId;
            const showAvatar = !isMe && (index === 0 || match.messages[index - 1].senderId !== message.senderId);

            return (
              <div
                key={message.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}
              >
                {/* Avatar for other user */}
                {!isMe && (
                  <div className={`w-8 h-8 flex-shrink-0 ${showAvatar ? '' : 'invisible'}`}>
                    <img
                      src={getAvatarSrc(otherUser?.avatar)}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                )}

                {/* Message bubble */}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isMe
                      ? 'bg-blue-500 text-white rounded-br-md'
                      : 'bg-white text-gray-900 shadow-sm rounded-bl-md'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                    {formatMessageTime(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      {canSendMessages ? (
        <form
          onSubmit={handleSendMessage}
          className="p-4 bg-white border-t border-gray-100"
        >
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-1 px-4 py-3 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              disabled={sending}
            />
            <button
              type="submit"
              className="w-11 h-11 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <div className="spinner spinner-sm border-white border-t-transparent" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
                </svg>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="p-4 bg-gray-50 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">
            {match.status === 'rejected' && 'Esta solicitud fue rechazada'}
            {match.status === 'cancelled' && 'Esta solicitud fue cancelada'}
          </p>
        </div>
      )}

      {/* Review Form Modal */}
      {showReviewForm && canReviewData?.targetUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Dejar reseña</h2>
              <button
                onClick={() => setShowReviewForm(false)}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-500">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>
            <ReviewForm
              experienceId={match.experienceId}
              targetId={canReviewData.targetUser.id}
              targetName={canReviewData.targetUser.name}
              onSuccess={() => {
                setShowReviewForm(false);
                setReviewSubmitted(true);
              }}
              onCancel={() => setShowReviewForm(false)}
            />
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && match && paymentStatus?.amount && (
        <PaymentModal
          matchId={match.id}
          amount={paymentStatus.amount}
          experienceTitle={match.experience.title}
          onSuccess={async () => {
            // Refresh payment status
            const payment = await paymentsApi.getPaymentStatus(match.id);
            setPaymentStatus(payment);
          }}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
}
