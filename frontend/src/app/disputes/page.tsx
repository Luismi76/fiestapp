'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/MainLayout';
import { getAvatarUrl, getUploadUrl } from '@/lib/utils';
import { OptimizedAvatar, OptimizedImage } from '@/components/OptimizedImage';
import api from '@/lib/api';

interface Dispute {
  id: string;
  matchId: string;
  reason: string;
  description: string;
  status: string;
  refundAmount?: number;
  createdAt: string;
  updatedAt: string;
  openedBy: {
    id: string;
    name: string;
    avatar?: string;
  };
  respondent: {
    id: string;
    name: string;
    avatar?: string;
  };
  match: {
    experience: {
      id: string;
      title: string;
      city: string;
    };
  };
  _count: {
    messages: number;
  };
}

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

export default function DisputesPage() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    const fetchDisputes = async () => {
      try {
        const params = filter ? `?status=${filter}` : '';
        const response = await api.get(`/disputes${params}`);
        setDisputes(response.data);
      } catch {
        setError('No se pudieron cargar las disputas');
      } finally {
        setLoading(false);
      }
    };

    fetchDisputes();
  }, [filter]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
            <div className="flex items-center px-4 h-14">
              <Link href="/dashboard" className="w-10 h-10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </Link>
              <span className="font-semibold ml-2">Mis disputas</span>
            </div>
          </header>
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center">
              <Link href="/dashboard" className="w-10 h-10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </Link>
              <span className="font-semibold ml-2">Mis disputas</span>
            </div>
          </div>
        </header>

        {/* Filter tabs */}
        <div className="bg-white border-b border-gray-100 px-4 py-3">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setFilter('')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === '' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter('OPEN')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === 'OPEN' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Abiertas
            </button>
            <button
              onClick={() => setFilter('UNDER_REVIEW')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === 'UNDER_REVIEW' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              En revision
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="p-4">
          {disputes.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">No hay disputas</h3>
              <p className="text-gray-500 text-sm">
                {filter ? 'No hay disputas con este filtro' : 'Aqui aparecerán tus disputas si las creas'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {disputes.map((dispute) => {
                const config = statusConfig[dispute.status] || statusConfig.OPEN;
                const isOpener = dispute.openedBy.id === user?.id;
                const otherUser = isOpener ? dispute.respondent : dispute.openedBy;

                return (
                  <Link
                    key={dispute.id}
                    href={`/disputes/${dispute.id}`}
                    className="block bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Experience header */}
                    <div className="flex items-center gap-3 p-4 border-b border-gray-100">
                      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 relative">
                        <OptimizedImage
                          src={getUploadUrl(dispute.match.experience.id) || '/images/feria_abril.png'}
                          alt={dispute.match.experience.title}
                          fill
                          preset="cardThumbnail"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {dispute.match.experience.title}
                        </h3>
                        <p className="text-sm text-gray-500">{dispute.match.experience.city}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                        {config.label}
                      </span>
                    </div>

                    {/* Dispute details */}
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <OptimizedAvatar
                          src={getAvatarUrl(otherUser.avatar)}
                          name={otherUser.name}
                          size="sm"
                        />
                        <div>
                          <p className="text-sm text-gray-600">
                            {isOpener ? 'Disputa con' : 'Abierta por'}{' '}
                            <span className="font-medium text-gray-900">{otherUser.name}</span>
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(dispute.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                          {reasonLabels[dispute.reason] || dispute.reason}
                        </span>
                        {dispute._count.messages > 0 && (
                          <span className="px-2 py-1 bg-blue-50 rounded text-xs text-blue-600">
                            {dispute._count.messages} mensaje{dispute._count.messages !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 line-clamp-2">
                        {dispute.description}
                      </p>

                      {dispute.refundAmount !== undefined && dispute.refundAmount > 0 && (
                        <div className="mt-3 p-2 bg-emerald-50 rounded-lg">
                          <p className="text-sm text-emerald-700">
                            Reembolso: <span className="font-semibold">{dispute.refundAmount.toFixed(2)}€</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
