'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { matchesApi, reviewsApi, walletApi, chatApi, quickRepliesApi, WalletInfo } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { MatchDetail, MatchStatus, Message } from '@/types/match';
import { CanReviewResponse } from '@/types/review';
import ReviewForm from '@/components/ReviewForm';
import { getAvatarUrl, getUploadUrl } from '@/lib/utils';
import { useSocket, useSocketEvent } from '@/hooks/useSocket';
import VoiceMessage from '@/components/chat/VoiceMessage';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import LocationMessage from '@/components/chat/LocationMessage';
import LocationPicker from '@/components/chat/LocationPicker';
import QuickRepliesDrawer from '@/components/chat/QuickRepliesDrawer';
import TranslateButton from '@/components/chat/TranslateButton';

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

  // WebSocket
  const { socket, isConnected, sendMessage: socketSendMessage, joinMatch, leaveMatch, setTyping, markAsRead } = useSocket();
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Review state
  const [canReviewData, setCanReviewData] = useState<CanReviewResponse | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Wallet state (for chat access)
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [walletError, setWalletError] = useState('');

  // Chat enhanced features state
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [userQuickReplies, setUserQuickReplies] = useState<{ id: string; text: string; emoji: string | null }[]>([]);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // For mock data, assume user is the host for IDs 1-3 and requester for IDs 10+
  const mockUserId = match ? (parseInt(match.id) < 10 ? match.hostId : 'me') : null;
  const isHost = useMockData ? (match ? parseInt(match.id) < 10 : false) : user?.id === match?.hostId;
  const otherUser = isHost ? match?.requester : match?.host;

  // Load user quick replies
  useEffect(() => {
    if (user) {
      quickRepliesApi.getUserReplies().then(setUserQuickReplies).catch(console.error);
    }
  }, [user]);

  // Handle translation
  const handleTranslate = async (messageId: string, targetLang: string) => {
    const result = await chatApi.translateMessage(messageId, targetLang);
    return result;
  };

  // Voice recorder hook - WhatsApp style (hold to record, release to send)
  const voiceRecorder = useVoiceRecorder({
    maxDuration: 60,
    onRecordingComplete: async (audioBlob, duration) => {
      if (!match) return;
      setSending(true);
      try {
        await chatApi.uploadVoice(audioBlob, match.id);
        // Message will appear via WebSocket
      } catch (err: unknown) {
        console.error('Error sending voice:', err);
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosError = err as { response?: { data?: unknown; status?: number } };
          const errorMessage = typeof axiosError.response?.data === 'object' && axiosError.response?.data !== null && 'message' in axiosError.response.data
            ? String((axiosError.response.data as { message: unknown }).message)
            : 'No se pudo enviar el audio';
          setVoiceError(errorMessage);
          setTimeout(() => setVoiceError(null), 3000);
        } else {
          setVoiceError('No se pudo enviar el audio');
          setTimeout(() => setVoiceError(null), 3000);
        }
      } finally {
        setSending(false);
      }
    },
    onError: (err) => {
      setVoiceError(err);
      setTimeout(() => setVoiceError(null), 3000);
    },
  });

  // Start/stop voice recording (WhatsApp style)
  const handleVoiceStart = () => {
    if (!sending && voiceRecorder.isSupported) {
      voiceRecorder.start();
    }
  };

  const handleVoiceEnd = () => {
    if (voiceRecorder.state === 'recording') {
      voiceRecorder.stop();
    }
  };

  const handleVoiceCancel = () => {
    if (voiceRecorder.state === 'recording') {
      voiceRecorder.cancel();
    }
  };

  // Handle location send
  const handleSendLocation = async (location: { latitude: number; longitude: number; name?: string }) => {
    if (!match) return;
    setShowLocationPicker(false);
    setSending(true);
    try {
      if (isConnected && socket) {
        socket.emit('sendLocationMessage', {
          matchId: match.id,
          latitude: location.latitude,
          longitude: location.longitude,
          locationName: location.name,
        });
      } else {
        // Fallback to REST (would need endpoint)
        setError('Necesitas conexión en tiempo real para enviar ubicación');
      }
    } catch (err) {
      console.error('Error sending location:', err);
      setError('No se pudo enviar la ubicación');
    } finally {
      setSending(false);
    }
  };

  // Handle quick reply select
  const handleQuickReplySelect = (text: string) => {
    setNewMessage(text);
    setShowQuickReplies(false);
  };

  useEffect(() => {
    const fetchMatch = async () => {
      const id = params.id as string;

      try {
        const data = await matchesApi.getById(id);
        setMatch(data);
        setUseMockData(false);

        // Check wallet balance for chat access
        if (data.status === 'pending' || data.status === 'accepted') {
          try {
            const wallet = await walletApi.getWallet();
            setWalletInfo(wallet);
          } catch {
            // Ignore wallet errors
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

  // Join/leave match room for WebSocket
  useEffect(() => {
    if (match && isConnected && !useMockData) {
      joinMatch(match.id);
      markAsRead(match.id);

      return () => {
        leaveMatch(match.id);
      };
    }
  }, [match?.id, isConnected, useMockData, joinMatch, leaveMatch, markAsRead]);

  // Handle incoming messages via WebSocket
  const handleNewMessage = useCallback((message: Message) => {
    console.log('[handleNewMessage] Received:', message);
    console.log('[handleNewMessage] Current match?.id:', match?.id);
    console.log('[handleNewMessage] Message matchId:', message.matchId);

    if (match && message.matchId === match.id) {
      console.log('[handleNewMessage] Adding message to state');
      setMatch(prev => {
        if (!prev) return prev;
        // Check if message already exists
        if (prev.messages.some(m => m.id === message.id)) {
          console.log('[handleNewMessage] Message already exists, skipping');
          return prev;
        }
        console.log('[handleNewMessage] Message added, new count:', prev.messages.length + 1);
        return {
          ...prev,
          messages: [...prev.messages, message],
        };
      });
      markAsRead(match.id);
    } else {
      console.log('[handleNewMessage] Message ignored - match mismatch');
    }
  }, [match?.id, markAsRead]);

  useSocketEvent(socket, 'newMessage', handleNewMessage);

  // Handle typing indicator
  const handleUserTyping = useCallback((data: { userId: string; isTyping: boolean }) => {
    if (match && data.userId !== user?.id) {
      setOtherUserTyping(data.isTyping);
      if (data.isTyping) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setOtherUserTyping(false);
        }, 3000);
      }
    }
  }, [match?.id, user?.id]);

  useSocketEvent(socket, 'userTyping', handleUserTyping);

  // Clean up typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Handle input change with typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    if (match && isConnected && e.target.value.length > 0) {
      setTyping(match.id, true);
    }
  };

  // Handle key down for Enter to send
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (newMessage.trim() && !sending) {
        handleSendMessage(e as unknown as React.FormEvent);
      }
    }
  };

  // Auto-resize textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [newMessage]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !match) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    // Stop typing indicator
    if (isConnected) {
      setTyping(match.id, false);
    }

    if (useMockData) {
      const mockMessage: Message = {
        id: `m${Date.now()}`,
        matchId: match.id,
        senderId: mockUserId || 'me',
        content: messageContent,
        createdAt: new Date().toISOString(),
        read: false,
        sender: { id: mockUserId || 'me', name: isHost ? match.host.name : (match.requester.name || 'Yo'), avatar: isHost ? match.host.avatar : match.requester.avatar },
      };
      setMatch({
        ...match,
        messages: [...match.messages, mockMessage],
      });
      return;
    }

    setSending(true);
    setError(''); // Clear previous errors
    setWalletError('');
    try {
      // Try WebSocket first if connected
      if (isConnected) {
        const message = await socketSendMessage(match.id, messageContent);
        if (message) {
          // Message already added via socket event, but ensure it's there
          setMatch(prev => {
            if (!prev) return prev;
            if (prev.messages.some(m => m.id === message.id)) {
              return prev;
            }
            return {
              ...prev,
              messages: [...prev.messages, message],
            };
          });
        } else {
          // Fallback to REST API if socket fails
          const restMessage = await matchesApi.sendMessage(match.id, messageContent);
          setMatch(prev => prev ? {
            ...prev,
            messages: [...prev.messages, restMessage],
          } : prev);
        }
      } else {
        // Use REST API
        const message = await matchesApi.sendMessage(match.id, messageContent);
        setMatch(prev => prev ? {
          ...prev,
          messages: [...prev.messages, message],
        } : prev);
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'No se pudo enviar el mensaje';
      // Check if it's a wallet balance error
      if (errorMessage.includes('monedero') || errorMessage.includes('saldo')) {
        setWalletError(errorMessage);
        // Refresh wallet info
        try {
          const wallet = await walletApi.getWallet();
          setWalletInfo(wallet);
        } catch {}
      } else {
        setError(errorMessage);
      }
      // Restore message on error
      setNewMessage(messageContent);
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

  const formatMessageDate = (date: string) => {
    const msgDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (msgDate.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (msgDate.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return msgDate.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    }
  };

  // Check if we should show date separator
  const shouldShowDateSeparator = (currentIndex: number) => {
    if (currentIndex === 0) return true;
    const currentDate = new Date(match!.messages[currentIndex].createdAt).toDateString();
    const prevDate = new Date(match!.messages[currentIndex - 1].createdAt).toDateString();
    return currentDate !== prevDate;
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
          <Link href="/messages" className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-full hover:bg-blue-600 transition-colors">
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
              src={getUploadUrl(match.experience.photos[0]) || '/images/feria_abril.png'}
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
          {/* Wallet balance warning for host */}
          {walletInfo && !walletInfo.canOperate && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-amber-600">
                    <path d="M2.273 5.625A4.483 4.483 0 0 1 5.25 4.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0 0 18.75 3H5.25a3 3 0 0 0-2.977 2.625ZM2.273 8.625A4.483 4.483 0 0 1 5.25 7.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0 0 18.75 6H5.25a3 3 0 0 0-2.977 2.625ZM5.25 9a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h13.5a3 3 0 0 0 3-3v-6a3 3 0 0 0-3-3H15a.75.75 0 0 0-.75.75 2.25 2.25 0 0 1-4.5 0A.75.75 0 0 0 9 9H5.25Z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-amber-800">Saldo insuficiente</p>
                  <p className="text-sm text-amber-600">
                    Necesitas {walletInfo.platformFee}€ en tu monedero para usar el chat. Saldo actual: {walletInfo.balance.toFixed(2)}€
                  </p>
                </div>
              </div>
              <Link
                href="/wallet"
                className="block w-full py-2 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors text-center"
              >
                Recargar monedero
              </Link>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAccept}
              className="flex-1 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors shadow-md flex items-center justify-center gap-2"
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
          {/* Wallet balance warning for requester */}
          {walletInfo && !walletInfo.canOperate && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-amber-600">
                    <path d="M2.273 5.625A4.483 4.483 0 0 1 5.25 4.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0 0 18.75 3H5.25a3 3 0 0 0-2.977 2.625ZM2.273 8.625A4.483 4.483 0 0 1 5.25 7.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0 0 18.75 6H5.25a3 3 0 0 0-2.977 2.625ZM5.25 9a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h13.5a3 3 0 0 0 3-3v-6a3 3 0 0 0-3-3H15a.75.75 0 0 0-.75.75 2.25 2.25 0 0 1-4.5 0A.75.75 0 0 0 9 9H5.25Z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-amber-800">Saldo insuficiente</p>
                  <p className="text-sm text-amber-600">
                    Necesitas {walletInfo.platformFee}€ en tu monedero para usar el chat. Saldo actual: {walletInfo.balance.toFixed(2)}€
                  </p>
                </div>
              </div>
              <Link
                href="/wallet"
                className="block w-full py-2 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors text-center"
              >
                Recargar monedero
              </Link>
            </div>
          )}

          {/* Wallet OK */}
          {walletInfo && walletInfo.canOperate && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-emerald-600">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-emerald-800">Saldo disponible</p>
                  <p className="text-sm text-emerald-600">
                    Tienes {walletInfo.balance.toFixed(2)}€. Al completar la experiencia se cobrarán {walletInfo.platformFee}€ de comisión.
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
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {match.messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-blue-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-700 mb-1">No hay mensajes aún</h3>
            <p className="text-gray-400 text-sm">¡Inicia la conversación con {otherUser?.name}!</p>
          </div>
        ) : (
          match.messages.map((message, index) => {
            const isMe = message.senderId === currentUserId;
            const showAvatar = !isMe && (index === 0 || match.messages[index - 1].senderId !== message.senderId);
            const isLastFromSender = index === match.messages.length - 1 || match.messages[index + 1].senderId !== message.senderId;
            const showDateSeparator = shouldShowDateSeparator(index);

            return (
              <div key={message.id}>
                {/* Date separator */}
                {showDateSeparator && (
                  <div className="flex items-center justify-center my-4">
                    <div className="bg-gray-100 text-gray-500 text-xs font-medium px-3 py-1 rounded-full">
                      {formatMessageDate(message.createdAt)}
                    </div>
                  </div>
                )}

                <div
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2 ${
                    isLastFromSender ? 'mb-2' : 'mb-0.5'
                  }`}
                >
                  {/* Avatar for other user */}
                  {!isMe && (
                    <div className={`w-7 h-7 flex-shrink-0 ${showAvatar ? '' : 'invisible'}`}>
                      <img
                        src={getAvatarSrc(otherUser?.avatar)}
                        alt=""
                        className="w-full h-full rounded-full object-cover ring-2 ring-white shadow-sm"
                      />
                    </div>
                  )}

                  {/* Message bubble */}
                  <div className={`max-w-[75%] group relative`}>
                    {/* Voice message */}
                    {message.type === 'VOICE' && message.voiceUrl ? (
                      <VoiceMessage
                        url={message.voiceUrl}
                        duration={message.voiceDuration || 0}
                        isOwn={isMe}
                      />
                    ) : message.type === 'LOCATION' && message.latitude && message.longitude ? (
                      /* Location message */
                      <LocationMessage
                        latitude={message.latitude}
                        longitude={message.longitude}
                        locationName={message.locationName}
                        isOwn={isMe}
                      />
                    ) : (
                      /* Text message */
                      <div
                        className={`px-4 py-2.5 ${
                          isMe
                            ? `bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md ${
                                isLastFromSender ? 'rounded-2xl rounded-br-md' : 'rounded-2xl'
                              }`
                            : `bg-white text-gray-900 shadow-sm border border-gray-100 ${
                                isLastFromSender ? 'rounded-2xl rounded-bl-md' : 'rounded-2xl'
                              }`
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                    )}
                    {/* Translate button for non-own messages */}
                    {!isMe && message.type !== 'VOICE' && message.type !== 'LOCATION' && message.content && (
                      <TranslateButton
                        messageId={message.id}
                        originalText={message.content}
                        originalLang={message.originalLang}
                        translations={message.translations as Record<string, string> | undefined}
                        onTranslate={handleTranslate}
                        compact
                      />
                    )}
                    {/* Timestamp and read status */}
                    <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <span className={`text-[10px] ${isMe ? 'text-gray-400' : 'text-gray-400'}`}>
                        {formatMessageTime(message.createdAt)}
                      </span>
                      {isMe && (
                        <span className="text-[10px]">
                          {message.read ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-blue-500">
                              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-gray-400">
                              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                            </svg>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Spacer for alignment when I'm the sender */}
                  {isMe && <div className="w-7 flex-shrink-0" />}
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator in messages area */}
        {otherUserTyping && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 flex-shrink-0">
              <img
                src={getAvatarSrc(otherUser?.avatar)}
                alt=""
                className="w-full h-full rounded-full object-cover ring-2 ring-white shadow-sm"
              />
            </div>
            <div className="bg-white shadow-sm border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      {canSendMessages ? (
        <div className="bg-white border-t border-gray-100 shadow-lg">
          {/* Connection status */}
          {!useMockData && (
            <div className={`px-4 pt-2 flex items-center gap-1.5 text-[11px] ${isConnected ? 'text-emerald-600' : 'text-gray-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
              {isConnected ? 'Conectado' : 'Conectando...'}
            </div>
          )}
          {/* Wallet error message */}
          {walletError && (
            <div className="mx-4 mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-amber-800">{walletError}</p>
                  <Link href="/wallet" className="text-sm text-amber-600 underline hover:text-amber-700">
                    Ir al monedero
                  </Link>
                </div>
                <button onClick={() => setWalletError('')} className="text-amber-600 hover:text-amber-700">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          {/* General error message */}
          {error && !walletError && (
            <div className="mx-4 mt-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-600 flex-shrink-0">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-800 flex-1">{error}</p>
                <button onClick={() => setError('')} className="text-red-600 hover:text-red-700">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          <form onSubmit={handleSendMessage} className="p-3">
            {/* Action buttons row */}
            <div className="flex items-center gap-1 mb-2 px-1">
              <button
                type="button"
                onClick={() => setShowQuickReplies(true)}
                className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                title="Respuestas rápidas"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setShowLocationPicker(true)}
                className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                title="Compartir ubicación"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
              </button>
            </div>
            {/* Recording indicator */}
            {voiceRecorder.state === 'recording' && (
              <div className="flex items-center gap-3 bg-red-50 rounded-2xl p-3 mb-2">
                <button
                  type="button"
                  onClick={handleVoiceCancel}
                  className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-red-600">
                  {Math.floor(voiceRecorder.duration / 60)}:{(voiceRecorder.duration % 60).toString().padStart(2, '0')}
                </span>
                <div className="flex-1 h-1 bg-red-200 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 transition-all" style={{ width: `${(voiceRecorder.duration / 60) * 100}%` }} />
                </div>
                <span className="text-xs text-gray-500">Suelta para enviar</span>
              </div>
            )}

            {/* Voice error message */}
            {voiceError && (
              <div className="text-xs text-red-500 text-center mb-2">{voiceError}</div>
            )}

            <div className="flex items-end gap-2 bg-gray-100 rounded-2xl p-1.5 pl-4">
              <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Escribe un mensaje..."
                rows={1}
                className="flex-1 bg-transparent text-sm resize-none focus:outline-none py-2.5 max-h-[120px] placeholder-gray-400"
                style={{ minHeight: '40px' }}
                disabled={sending || voiceRecorder.state === 'recording'}
              />

              {/* Send button (when text) or Mic button (when empty) */}
              {newMessage.trim() ? (
                <button
                  type="submit"
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                    !sending
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md hover:shadow-lg hover:scale-105'
                      : 'bg-gray-300 text-gray-500'
                  }`}
                  disabled={sending}
                >
                  {sending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
                    </svg>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onMouseDown={handleVoiceStart}
                  onMouseUp={handleVoiceEnd}
                  onMouseLeave={handleVoiceEnd}
                  onTouchStart={handleVoiceStart}
                  onTouchEnd={handleVoiceEnd}
                  disabled={sending || !voiceRecorder.isSupported}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                    voiceRecorder.state === 'recording'
                      ? 'bg-red-500 text-white scale-110'
                      : sending
                        ? 'bg-gray-300 text-gray-500'
                        : 'bg-gradient-to-br from-primary to-primary/80 text-white shadow-md hover:shadow-lg hover:scale-105'
                  }`}
                  title={voiceRecorder.isSupported ? 'Mantén pulsado para grabar' : 'Tu navegador no soporta grabación'}
                >
                  {sending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                    </svg>
                  )}
                </button>
              )}
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-1.5">
              {newMessage.trim() ? 'Enter enviar, Shift+Enter nueva línea' : 'Mantén 🎤 para grabar voz'}
            </p>
          </form>
        </div>
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

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <LocationPicker
          onSelect={handleSendLocation}
          onCancel={() => setShowLocationPicker(false)}
        />
      )}

      {/* Quick Replies Drawer */}
      <QuickRepliesDrawer
        isOpen={showQuickReplies}
        onClose={() => setShowQuickReplies(false)}
        onSelect={handleQuickReplySelect}
        userReplies={userQuickReplies}
        onAddReply={async (text, emoji) => {
          const newReply = await quickRepliesApi.create(text, emoji);
          setUserQuickReplies(prev => [...prev, newReply]);
        }}
        onDeleteReply={async (id) => {
          await quickRepliesApi.delete(id);
          setUserQuickReplies(prev => prev.filter(r => r.id !== id));
        }}
      />

    </div>
  );
}
