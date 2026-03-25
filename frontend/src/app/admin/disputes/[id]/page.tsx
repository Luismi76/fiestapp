'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getAvatarUrl } from '@/lib/utils';
import { OptimizedAvatar } from '@/components/OptimizedImage';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminDisputesApi, type Dispute, type DisputeMessage } from '@/lib/api';

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  OPEN: { label: 'Abierta', bg: 'bg-amber-100', text: 'text-amber-700' },
  UNDER_REVIEW: { label: 'En revision', bg: 'bg-blue-100', text: 'text-blue-700' },
  RESOLVED_REFUND: { label: 'Resuelta (Reembolso)', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  RESOLVED_PARTIAL_REFUND: { label: 'Resuelta (Parcial)', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  RESOLVED_NO_REFUND: { label: 'Resuelta (Sin reembolso)', bg: 'bg-gray-100', text: 'text-gray-700' },
  CLOSED: { label: 'Cerrada', bg: 'bg-gray-100', text: 'text-gray-600' },
};

const reasonLabels: Record<string, string> = {
  NO_SHOW: 'No se presento',
  EXPERIENCE_MISMATCH: 'No coincidio con lo descrito',
  SAFETY_CONCERN: 'Preocupacion de seguridad',
  PAYMENT_ISSUE: 'Problema con el pago',
  COMMUNICATION: 'Problema de comunicacion',
  OTHER: 'Otro motivo',
};

export default function AdminDisputeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await adminDisputesApi.getDetail(id);
        setDispute(data);
      } catch {
        setError('No se pudo cargar la disputa');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dispute?.messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const msg = await adminDisputesApi.addMessage(id, newMessage.trim());
      setDispute(prev => prev ? {
        ...prev,
        messages: [...(prev.messages || []), msg],
      } : prev);
      setNewMessage('');
    } catch {
      setError('No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  const handleMarkUnderReview = async () => {
    try {
      await adminDisputesApi.markUnderReview(id);
      setDispute(prev => prev ? { ...prev, status: 'UNDER_REVIEW' } : prev);
    } catch {
      setError('No se pudo actualizar el estado');
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!dispute) {
    return (
      <AdminLayout section="moderacion" title="Detalle Disputa">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 mb-4">{error || 'Disputa no encontrada'}</p>
            <button onClick={() => router.back()} className="text-primary hover:underline">
              Volver
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const config = statusConfig[dispute.status] || statusConfig.OPEN;
  const isActive = ['OPEN', 'UNDER_REVIEW'].includes(dispute.status);

  return (
    <AdminLayout section="moderacion" title="Detalle Disputa">
      <div className="min-h-screen bg-gray-50">


        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
              <button onClick={() => setError('')} className="ml-2 underline">Cerrar</button>
            </div>
          )}

          {/* Header card */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-bold text-gray-900">
                    #{dispute.id.slice(0, 8)}
                  </h2>
                  <span className={`text-xs px-2.5 py-1 rounded-full ${config.bg} ${config.text}`}>
                    {config.label}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{formatDate(dispute.createdAt)}</p>
              </div>
              {isActive && (
                <div className="flex gap-2">
                  {dispute.status === 'OPEN' && (
                    <button
                      onClick={handleMarkUnderReview}
                      className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                    >
                      Marcar en revision
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Experience & Reason */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Experiencia</p>
                <p className="text-sm font-medium text-gray-900">{dispute.match.experience.title}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Motivo</p>
                <p className="text-sm font-medium text-gray-900">
                  {reasonLabels[dispute.reason] || dispute.reason}
                </p>
              </div>
            </div>

            {/* Parties */}
            <div className="flex items-center gap-4 py-3 border-t border-gray-100">
              <div className="flex items-center gap-2 flex-1">
                <OptimizedAvatar
                  src={getAvatarUrl(dispute.openedBy?.avatar)}
                  name={dispute.openedBy?.name ?? 'Usuario'}
                  size="sm"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{dispute.openedBy?.name ?? 'Usuario'}</p>
                  <p className="text-xs text-gray-500">Abrio la disputa</p>
                </div>
              </div>
              <span className="text-xs text-gray-400 font-medium">VS</span>
              <div className="flex items-center gap-2 flex-1 justify-end text-right">
                <div>
                  <p className="text-sm font-medium text-gray-900">{dispute.respondent?.name ?? 'Usuario'}</p>
                  <p className="text-xs text-gray-500">Demandado</p>
                </div>
                <OptimizedAvatar
                  src={getAvatarUrl(dispute.respondent?.avatar)}
                  name={dispute.respondent?.name ?? 'Usuario'}
                  size="sm"
                />
              </div>
            </div>

            {/* Description */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Descripción</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{dispute.description}</p>
            </div>

            {/* Evidence */}
            {dispute.evidence && (dispute.evidence as string[]).length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Evidencia</p>
                <div className="flex flex-wrap gap-2">
                  {(dispute.evidence as string[]).map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline bg-primary/5 px-2 py-1 rounded"
                    >
                      Archivo {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Resolution info */}
            {dispute.resolution && (
              <div className="mt-4 pt-4 border-t border-gray-100 bg-emerald-50 -mx-6 -mb-6 p-6 rounded-b-xl">
                <p className="text-xs text-emerald-600 font-medium mb-1">Resolucion</p>
                <p className="text-sm text-gray-700">{dispute.resolution}</p>
                {dispute.refundAmount != null && dispute.refundAmount > 0 && (
                  <p className="text-sm text-emerald-700 font-medium mt-2">
                    Reembolso: {dispute.refundAmount.toFixed(2)} EUR ({dispute.refundPercentage}%)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                Mensajes ({dispute.messages?.length || 0})
              </h3>
            </div>

            <div className="max-h-[400px] overflow-y-auto p-6 space-y-4">
              {(!dispute.messages || dispute.messages.length === 0) ? (
                <p className="text-center text-gray-400 text-sm py-8">No hay mensajes aun</p>
              ) : (
                dispute.messages.map((msg: DisputeMessage) => (
                  <div key={msg.id} className={`flex gap-3 ${msg.isAdmin ? 'bg-blue-50 -mx-2 px-2 py-2 rounded-lg' : ''}`}>
                    <OptimizedAvatar
                      src={getAvatarUrl(msg.sender?.avatar)}
                      name={msg.sender?.name ?? 'Usuario'}
                      size="sm"
                      className="w-8 h-8 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-gray-900">{msg.sender?.name ?? 'Usuario'}</span>
                        {msg.isAdmin && (
                          <span className="text-[10px] bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                            Admin
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {new Date(msg.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Send message form */}
            {isActive && (
              <form onSubmit={handleSendMessage} className="px-6 py-4 border-t border-gray-100 flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Mensaje como administrador..."
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {sending ? 'Enviando...' : 'Enviar'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
