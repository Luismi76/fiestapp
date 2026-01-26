'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getAvatarUrl } from '@/lib/utils';
import { OptimizedAvatar } from '@/components/OptimizedImage';
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

interface DisputeStats {
  byStatus: Record<string, number>;
  byReason: Record<string, number>;
  last30Days: number;
  totalRefunded: number;
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
  EXPERIENCE_MISMATCH: 'No coincidio',
  SAFETY_CONCERN: 'Seguridad',
  PAYMENT_ISSUE: 'Pago',
  COMMUNICATION: 'Comunicacion',
  OTHER: 'Otro',
};

export default function AdminDisputesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [stats, setStats] = useState<DisputeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDispute, setSelectedDispute] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolutionForm, setResolutionForm] = useState({
    resolution: 'RESOLVED_REFUND' as string,
    resolutionDescription: '',
    refundPercentage: 100,
  });

  // Check if admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Fetch disputes
  useEffect(() => {
    const fetchDisputes = async () => {
      try {
        const params = new URLSearchParams();
        if (filter) params.append('status', filter);
        params.append('page', page.toString());
        params.append('limit', '10');

        const [disputesRes, statsRes] = await Promise.all([
          api.get(`/admin/disputes?${params}`),
          api.get('/admin/disputes/stats'),
        ]);

        setDisputes(disputesRes.data.disputes);
        setTotalPages(disputesRes.data.pagination.totalPages);
        setStats(statsRes.data);
      } catch {
        setError('No se pudieron cargar las disputas');
      } finally {
        setLoading(false);
      }
    };

    fetchDisputes();
  }, [filter, page]);

  const handleMarkUnderReview = async (disputeId: string) => {
    try {
      await api.patch(`/admin/disputes/${disputeId}/review`);
      setDisputes(disputes.map(d =>
        d.id === disputeId ? { ...d, status: 'UNDER_REVIEW' } : d
      ));
    } catch {
      setError('No se pudo actualizar la disputa');
    }
  };

  const handleResolve = async () => {
    if (!selectedDispute || !resolutionForm.resolutionDescription) return;

    setResolving(true);
    try {
      await api.patch(`/admin/disputes/${selectedDispute}/resolve`, {
        resolution: resolutionForm.resolution,
        resolutionDescription: resolutionForm.resolutionDescription,
        refundPercentage: resolutionForm.resolution === 'RESOLVED_PARTIAL_REFUND'
          ? resolutionForm.refundPercentage
          : undefined,
      });

      setDisputes(disputes.map(d =>
        d.id === selectedDispute ? { ...d, status: resolutionForm.resolution } : d
      ));
      setSelectedDispute(null);
      setResolutionForm({
        resolution: 'RESOLVED_REFUND',
        resolutionDescription: '',
        refundPercentage: 100,
      });
    } catch {
      setError('No se pudo resolver la disputa');
    } finally {
      setResolving(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </Link>
              <h1 className="text-xl font-bold text-gray-900">Gestion de Disputas</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm text-gray-500">Abiertas</p>
              <p className="text-2xl font-bold text-amber-600">{stats.byStatus.OPEN || 0}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm text-gray-500">En revision</p>
              <p className="text-2xl font-bold text-blue-600">{stats.byStatus.UNDER_REVIEW || 0}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm text-gray-500">Ultimos 30 dias</p>
              <p className="text-2xl font-bold text-gray-900">{stats.last30Days}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm text-gray-500">Total reembolsado</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.totalRefunded.toFixed(2)}€</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setFilter(''); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === '' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => { setFilter('OPEN'); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'OPEN' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Abiertas ({stats?.byStatus.OPEN || 0})
            </button>
            <button
              onClick={() => { setFilter('UNDER_REVIEW'); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'UNDER_REVIEW' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              En revision ({stats?.byStatus.UNDER_REVIEW || 0})
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
            <button onClick={() => setError('')} className="ml-2 underline">Cerrar</button>
          </div>
        )}

        {/* Disputes Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {disputes.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <p className="text-gray-500">No hay disputas {filter ? 'con este filtro' : ''}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Experiencia</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partes</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {disputes.map((dispute) => {
                    const config = statusConfig[dispute.status] || statusConfig.OPEN;
                    const canResolve = ['OPEN', 'UNDER_REVIEW'].includes(dispute.status);

                    return (
                      <tr key={dispute.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link href={`/admin/disputes/${dispute.id}`} className="text-sm font-mono text-primary hover:underline">
                            #{dispute.id.slice(0, 8)}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                            {dispute.match.experience.title}
                          </p>
                          <p className="text-xs text-gray-500">{dispute.match.experience.city}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <OptimizedAvatar
                              src={getAvatarUrl(dispute.openedBy.avatar)}
                              name={dispute.openedBy.name}
                              size="sm"
                            />
                            <span className="text-xs text-gray-400">vs</span>
                            <OptimizedAvatar
                              src={getAvatarUrl(dispute.respondent.avatar)}
                              name={dispute.respondent.name}
                              size="sm"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                            {reasonLabels[dispute.reason] || dispute.reason}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${config.bg} ${config.text}`}>
                            {config.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(dispute.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/disputes/${dispute.id}`}
                              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                              Ver
                            </Link>
                            {dispute.status === 'OPEN' && (
                              <button
                                onClick={() => handleMarkUnderReview(dispute.id)}
                                className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                              >
                                Revisar
                              </button>
                            )}
                            {canResolve && (
                              <button
                                onClick={() => setSelectedDispute(dispute.id)}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600"
                              >
                                Resolver
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-500">
                Pagina {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Resolve Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Resolver Disputa</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de resolucion
                </label>
                <select
                  value={resolutionForm.resolution}
                  onChange={(e) => setResolutionForm({ ...resolutionForm, resolution: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="RESOLVED_REFUND">Reembolso total (100%)</option>
                  <option value="RESOLVED_PARTIAL_REFUND">Reembolso parcial</option>
                  <option value="RESOLVED_NO_REFUND">Sin reembolso</option>
                  <option value="CLOSED">Cerrar sin accion</option>
                </select>
              </div>

              {resolutionForm.resolution === 'RESOLVED_PARTIAL_REFUND' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Porcentaje de reembolso: {resolutionForm.refundPercentage}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={resolutionForm.refundPercentage}
                    onChange={(e) => setResolutionForm({ ...resolutionForm, refundPercentage: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripcion de la resolucion
                </label>
                <textarea
                  value={resolutionForm.resolutionDescription}
                  onChange={(e) => setResolutionForm({ ...resolutionForm, resolutionDescription: e.target.value })}
                  rows={4}
                  placeholder="Explica la decision tomada..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelectedDispute(null)}
                className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleResolve}
                disabled={!resolutionForm.resolutionDescription || resolving}
                className="flex-1 px-4 py-2 text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 disabled:opacity-50"
              >
                {resolving ? 'Resolviendo...' : 'Resolver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
