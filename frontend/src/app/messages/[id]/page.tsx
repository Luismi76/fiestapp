'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { matchesApi, reviewsApi, walletApi, chatApi, quickRepliesApi, WalletInfo } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages } from '@/contexts/MessageContext';
import { MatchDetail, Message } from '@/types/match';
import { CanReviewResponse } from '@/types/review';
import ReviewForm from '@/components/ReviewForm';
import { getAvatarUrl } from '@/lib/utils';
import { useSocket, useSocketEvent } from '@/hooks/useSocket';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import logger from '@/lib/logger';
import { getErrorMessage } from '@/lib/error';
import MainLayout from '@/components/MainLayout';
import { ChatSkeleton } from '@/components/ui/Skeleton';

// Chat components
import ChatHeader from '@/components/chat/ChatHeader';
import ExperienceCard from '@/components/chat/ExperienceCard';
import MatchActions from '@/components/chat/MatchActions';
import MessageList from '@/components/chat/MessageList';
import ChatInput from '@/components/chat/ChatInput';
import LocationPicker from '@/components/chat/LocationPicker';
import QuickRepliesDrawer from '@/components/chat/QuickRepliesDrawer';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { markMatchAsRead } = useMessages();
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const isHost = user?.id === match?.hostId;
  const otherUser = isHost ? match?.requester : match?.host;

  // Load user quick replies
  useEffect(() => {
    if (user) {
      quickRepliesApi.getUserReplies().then(setUserQuickReplies).catch((err) => logger.error('Error loading quick replies:', err));
    }
  }, [user]);

  // Handle translation
  const handleTranslate = async (messageId: string, targetLang: string) => {
    const result = await chatApi.translateMessage(messageId, targetLang);
    return result;
  };

  // Voice recorder hook
  const voiceRecorder = useVoiceRecorder({
    maxDuration: 60,
    onRecordingComplete: async (audioBlob) => {
      if (!match) return;
      setSending(true);
      try {
        await chatApi.uploadVoice(audioBlob, match.id);
      } catch (err: unknown) {
        logger.error('Error sending voice:', err);
        const errorMessage = getErrorMessage(err, 'No se pudo enviar el audio');
        setVoiceError(errorMessage);
        setTimeout(() => setVoiceError(null), 3000);
      } finally {
        setSending(false);
      }
    },
    onError: (err) => {
      setVoiceError(err);
      setTimeout(() => setVoiceError(null), 3000);
    },
  });

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
        setError('Necesitas conexión en tiempo real para enviar ubicación');
      }
    } catch (err) {
      logger.error('Error sending location:', err);
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

  // Fetch match data
  useEffect(() => {
    const fetchMatch = async () => {
      const id = params.id as string;
      try {
        const data = await matchesApi.getById(id);
        setMatch(data);

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
        setError('No se pudo cargar la conversación');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchMatch();
    }
  }, [params.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [match?.messages]);

  // Join/leave match room for WebSocket
  useEffect(() => {
    if (match && isConnected) {
      joinMatch(match.id);
      markAsRead(match.id);
      markMatchAsRead(match.id);

      return () => {
        leaveMatch(match.id);
      };
    }
  }, [match?.id, isConnected, joinMatch, leaveMatch, markAsRead, markMatchAsRead]);

  // Handle incoming messages via WebSocket
  const handleNewMessage = useCallback((message: Message) => {
    logger.socket('[handleNewMessage] Received:', message);
    if (match && message.matchId === match.id) {
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
      markAsRead(match.id);
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !match) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    if (isConnected) {
      setTyping(match.id, false);
    }

    setSending(true);
    setError('');
    setWalletError('');

    try {
      if (isConnected) {
        const message = await socketSendMessage(match.id, messageContent);
        if (message) {
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
          const restMessage = await matchesApi.sendMessage(match.id, messageContent);
          setMatch(prev => prev ? {
            ...prev,
            messages: [...prev.messages, restMessage],
          } : prev);
        }
      } else {
        const message = await matchesApi.sendMessage(match.id, messageContent);
        setMatch(prev => prev ? {
          ...prev,
          messages: [...prev.messages, message],
        } : prev);
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err, 'No se pudo enviar el mensaje');
      if (errorMessage.includes('monedero') || errorMessage.includes('saldo')) {
        setWalletError(errorMessage);
        try {
          const wallet = await walletApi.getWallet();
          setWalletInfo(wallet);
        } catch {}
      } else {
        setError(errorMessage);
      }
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  // Match actions
  const handleAccept = async () => {
    if (!match) return;
    try {
      await matchesApi.accept(match.id);
      setMatch({ ...match, status: 'accepted' });
    } catch {
      setError('No se pudo aceptar la solicitud');
    }
  };

  const handleReject = async () => {
    if (!match) return;
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
    try {
      await matchesApi.cancel(match.id);
      setMatch({ ...match, status: 'cancelled' });
    } catch {
      setError('No se pudo cancelar');
    }
  };

  const handleComplete = async () => {
    if (!match) return;
    try {
      await matchesApi.complete(match.id);
      setMatch({ ...match, status: 'completed' });
      const reviewCheck = await reviewsApi.canReview(match.experienceId);
      setCanReviewData(reviewCheck);
    } catch {
      setError('No se pudo marcar como completada');
    }
  };

  const getAvatarSrc = (avatar?: string): string => {
    if (!avatar) return '/images/user_ana.png';
    if (avatar.startsWith('/images/')) return avatar;
    return getAvatarUrl(avatar) || '/images/user_ana.png';
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50">
          <ChatSkeleton />
        </div>
      </MainLayout>
    );
  }

  if (error && !match) {
    return (
      <MainLayout>
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
      </MainLayout>
    );
  }

  if (!match) return null;

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <ChatHeader
          otherUser={otherUser}
          status={match.status}
          getAvatarSrc={getAvatarSrc}
        />

        <ExperienceCard experience={match.experience} />

        <MatchActions
          status={match.status}
          isHost={isHost}
          walletInfo={walletInfo}
          canReviewData={canReviewData}
          reviewSubmitted={reviewSubmitted}
          onAccept={handleAccept}
          onReject={handleReject}
          onCancel={handleCancel}
          onComplete={handleComplete}
          onShowReviewForm={() => setShowReviewForm(true)}
        />

        <MessageList
          messages={match.messages}
          currentUserId={user?.id}
          otherUser={otherUser}
          otherUserTyping={otherUserTyping}
          messagesEndRef={messagesEndRef}
          getAvatarSrc={getAvatarSrc}
          onTranslate={handleTranslate}
        />

        <ChatInput
          status={match.status}
          newMessage={newMessage}
          sending={sending}
          isConnected={isConnected}
          useMockData={false}
          walletError={walletError}
          error={error}
          voiceRecorder={{
            state: voiceRecorder.state,
            duration: voiceRecorder.duration,
            isSupported: voiceRecorder.isSupported,
          }}
          voiceError={voiceError}
          textareaRef={textareaRef}
          onMessageChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onSendMessage={handleSendMessage}
          onVoiceStart={handleVoiceStart}
          onVoiceEnd={handleVoiceEnd}
          onVoiceCancel={handleVoiceCancel}
          onShowLocationPicker={() => setShowLocationPicker(true)}
          onShowQuickReplies={() => setShowQuickReplies(true)}
          onClearWalletError={() => setWalletError('')}
          onClearError={() => setError('')}
        />

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
    </MainLayout>
  );
}
