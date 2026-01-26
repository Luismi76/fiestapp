'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/MainLayout';
import { getAvatarUrl, getUploadUrl } from '@/lib/utils';
import { OptimizedAvatar, OptimizedImage } from '@/components/OptimizedImage';
import api from '@/lib/api';

interface DisputeMessage {
  id: string;
  content: string;
  isAdmin: boolean;
  attachments?: string[];
  createdAt: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface DisputeDetail {
  id: string;
  matchId: string;
  reason: string;
  description: string;
  status: string;
  evidence?: string[];
  resolution?: string;
  refundAmount?: number;
  refundPercentage?: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  openedBy: {
    id: string;
    name: string;
    avatar?: string;
    email: string;
  };
  respondent: {
    id: string;
    name: string;
    avatar?: string;
    email: string;
  };
  resolvedBy?: {
    id: string;
    name: string;
  };
  match: {
    experience: {
      id: string;
      title: string;
      city: string;
      photos?: string[];
    };
  };
  messages: DisputeMessage[];
}

const statusConfig: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  OPEN: { label: 'Abierta', bg: 'bg-amber-100', text: 'text-amber-700', icon: 'bg-amber-500' },
  UNDER_REVIEW: { label: 'En revision', bg: 'bg-blue-100', text: 'text-blue-700', icon: 'bg-blue-500' },
  RESOLVED_REFUND: { label: 'Resuelta con reembolso', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'bg-emerald-500' },
  RESOLVED_PARTIAL_REFUND: { label: 'Resuelta con reembolso parcial', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'bg-emerald-500' },
  RESOLVED_NO_REFUND: { label: 'Resuelta sin reembolso', bg: 'bg-gray-100', text: 'text-gray-700', icon: 'bg-gray-500' },
  CLOSED: { label: 'Cerrada', bg: 'bg-gray-100', text: 'text-gray-600', icon: 'bg-gray-500' },
};

const reasonLabels: Record<string, string> = {
  NO_SHOW: 'No se presento',
  EXPERIENCE_MISMATCH: 'No coincidio con lo descrito',
  SAFETY_CONCERN: 'Preocupacion de seguridad',
  PAYMENT_ISSUE: 'Problema con el pago',
  COMMUNICATION: 'Problema de comunicacion',
  OTHER: 'Otro motivo',
};

export default function DisputeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [dispute, setDispute] = useState<DisputeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchDispute = async () => {
      try {
        const response = await api.get(`/disputes/${params.id}`);
        setDispute(response.data);
      } catch {
        setError('No se pudo cargar la disputa');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchDispute();
    }
  }, [params.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dispute?.messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !dispute) return;

    setSending(true);
    try {
      const response = await api.post(`/disputes/${dispute.id}/messages`, {
        content: newMessage.trim(),
      });
      setDispute({
        ...dispute,
        messages: [...dispute.messages, response.data],
      });
      setNewMessage('');
    } catch {
      setError('No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isResolved = dispute?.status?.startsWith('RESOLVED') || dispute?.status === 'CLOSED';

  if (loading) {
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
              <span className="font-semibold ml-2">Disputa</span>
            </div>
          </header>
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !dispute) {
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
            <Link href="/disputes" className="px-6 py-3 bg-primary text-white font-semibold rounded-full hover:opacity-90 transition-opacity">
              Volver a disputas
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const config = statusConfig[dispute.status] || statusConfig.OPEN;

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="flex items-center gap-3 px-4 h-16">
            <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-gray-900 truncate">Disputa #{dispute.id.slice(0, 8).toUpperCase()}</h1>
              <p className="text-xs text-gray-500">{formatDate(dispute.createdAt)}</p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
              {config.label}
            </span>
          </div>
        </header>

        {/* Experience Card */}
        <Link
          href={`/experiences/${dispute.match.experience.id}`}
          className="mx-4 mt-4 bg-white rounded-2xl shadow-sm overflow-hidden flex items-center gap-3 hover:shadow-md transition-shadow"
        >
          <div className="w-16 h-16 flex-shrink-0 relative">
            {dispute.match.experience.photos?.[0] ? (
              <OptimizedImage
                src={getUploadUrl(dispute.match.experience.photos[0]) || '/images/feria_abril.png'}
                alt={dispute.match.experience.title}
                fill
                preset="cardThumbnail"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                <span className="text-2xl text-white/50">🎭</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 py-2">
            <h3 className="font-medium text-sm text-gray-900 truncate">{dispute.match.experience.title}</h3>
            <p className="text-xs text-gray-500">{dispute.match.experience.city}</p>
          </div>
          <div className="pr-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-300">
              <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </div>
        </Link>

        {/* Dispute Info */}
        <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full ${config.icon} flex items-center justify-center`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Motivo de la disputa</h3>
              <p className="text-sm text-gray-500">{reasonLabels[dispute.reason] || dispute.reason}</p>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl mb-4">
            <p className="text-sm text-gray-700">{dispute.description}</p>
          </div>

          {/* Participants */}
          <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <OptimizedAvatar
                src={getAvatarUrl(dispute.openedBy.avatar)}
                name={dispute.openedBy.name}
                size="sm"
              />
              <div>
                <p className="text-xs text-gray-500">Abierta por</p>
                <p className="text-sm font-medium text-gray-900">{dispute.openedBy.name}</p>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs text-gray-500">Contra</p>
                <p className="text-sm font-medium text-gray-900">{dispute.respondent.name}</p>
              </div>
              <OptimizedAvatar
                src={getAvatarUrl(dispute.respondent.avatar)}
                name={dispute.respondent.name}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Resolution (if resolved) */}
        {isResolved && dispute.resolution && (
          <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-emerald-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Resolucion</h3>
                {dispute.resolvedBy && (
                  <p className="text-xs text-gray-500">Por {dispute.resolvedBy.name} - {formatDate(dispute.resolvedAt || dispute.updatedAt)}</p>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-3">{dispute.resolution}</p>

            {dispute.refundAmount !== undefined && dispute.refundAmount > 0 && (
              <div className="p-3 bg-emerald-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-emerald-700">Reembolso ({dispute.refundPercentage}%)</span>
                  <span className="text-lg font-bold text-emerald-700">{dispute.refundAmount.toFixed(2)}€</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <h3 className="font-semibold text-gray-900 mb-2">Conversacion</h3>

          {dispute.messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">No hay mensajes aun</p>
              <p className="text-xs text-gray-400 mt-1">Envía un mensaje para comunicarte sobre esta disputa</p>
            </div>
          ) : (
            dispute.messages.map((message) => {
              const isMe = message.sender.id === user?.id;

              return (
                <div
                  key={message.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}
                >
                  {!isMe && (
                    <OptimizedAvatar
                      src={getAvatarUrl(message.sender.avatar)}
                      name={message.sender.name}
                      size="sm"
                      className="w-7 h-7"
                    />
                  )}

                  <div className={`max-w-[75%]`}>
                    {/* Admin badge */}
                    {message.isAdmin && (
                      <div className={`text-xs mb-1 ${isMe ? 'text-right' : 'text-left'}`}>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                          Soporte FiestApp
                        </span>
                      </div>
                    )}

                    <div
                      className={`px-4 py-2.5 ${
                        isMe
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-md'
                          : message.isAdmin
                            ? 'bg-blue-50 text-gray-900 border border-blue-200 rounded-2xl rounded-bl-md'
                            : 'bg-white text-gray-900 shadow-sm border border-gray-100 rounded-2xl rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                    </div>

                    <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[10px] text-gray-400">
                        {formatTime(message.createdAt)}
                      </span>
                    </div>
                  </div>

                  {isMe && <div className="w-7 flex-shrink-0" />}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        {!isResolved ? (
          <div className="bg-white border-t border-gray-100 shadow-lg p-3">
            <form onSubmit={handleSendMessage} className="flex items-end gap-2 bg-gray-100 rounded-2xl p-1.5 pl-4">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                rows={1}
                className="flex-1 bg-transparent text-sm resize-none focus:outline-none py-2.5 max-h-[120px] placeholder-gray-400"
                style={{ minHeight: '40px' }}
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                  newMessage.trim() && !sending
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md hover:shadow-lg hover:scale-105'
                    : 'bg-gray-300 text-gray-500'
                }`}
              >
                {sending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
                  </svg>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-gray-50 border-t border-gray-200 p-4 text-center">
            <p className="text-sm text-gray-500">
              Esta disputa ha sido resuelta. No se pueden enviar mas mensajes.
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
