'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAvatarUrl } from '@/lib/utils';
import { OptimizedAvatar } from '@/components/OptimizedImage';
import AdminLayout from '@/components/admin/AdminLayout';
import { AdminPagination } from '@/components/admin';
import { useToast } from '@/components/ui/Toast';
import api, {
  adminDisputesApi,
  type Dispute,
  type DisputeStats,
  reportsApi,
  Report,
  ReportsResponse,
  ReportStats,
} from '@/lib/api';

/* ══════════════════════════════════════════════════════════════════════════
   DISPUTAS CONTENT
   ══════════════════════════════════════════════════════════════════════════ */

const disputeStatusConfig: Record<string, { label: string; bg: string; text: string }> = {
  OPEN: { label: 'Abierta', bg: 'bg-amber-100', text: 'text-amber-700' },
  UNDER_REVIEW: { label: 'En revision', bg: 'bg-blue-100', text: 'text-blue-700' },
  RESOLVED_REFUND: { label: 'Resuelta (Reembolso)', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  RESOLVED_PARTIAL_REFUND: { label: 'Resuelta (Parcial)', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  RESOLVED_NO_REFUND: { label: 'Resuelta (Sin reembolso)', bg: 'bg-gray-100', text: 'text-gray-700' },
  CLOSED: { label: 'Cerrada', bg: 'bg-gray-100', text: 'text-gray-600' },
};

const disputeReasonLabels: Record<string, string> = {
  NO_SHOW: 'No se presento',
  EXPERIENCE_MISMATCH: 'No coincidio',
  SAFETY_CONCERN: 'Seguridad',
  PAYMENT_ISSUE: 'Pago',
  COMMUNICATION: 'Comunicacion',
  OTHER: 'Otro',
};

function DisputasContent() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [stats, setStats] = useState<DisputeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('');
  const [reasonFilter, setReasonFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDispute, setSelectedDispute] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolutionForm, setResolutionForm] = useState({
    resolution: 'RESOLVED_REFUND' as string,
    resolutionDescription: '',
    refundPercentage: 100,
    favoredParty: '' as '' | 'opener' | 'respondent',
  });

  // Fetch disputes
  useEffect(() => {
    const fetchDisputes = async () => {
      try {
        const [disputesRes, statsRes] = await Promise.all([
          adminDisputesApi.getAll({
            status: filter || undefined,
            reason: reasonFilter || undefined,
            search: search || undefined,
            page,
            limit: 10,
          }),
          adminDisputesApi.getStats(),
        ]);

        setDisputes(disputesRes.disputes);
        setTotalPages(disputesRes.pagination.totalPages);
        setStats(statsRes);
      } catch {
        setError('No se pudieron cargar las disputas');
      } finally {
        setLoading(false);
      }
    };

    fetchDisputes();
  }, [filter, reasonFilter, search, page]);

  const handleMarkUnderReview = async (disputeId: string) => {
    try {
      await adminDisputesApi.markUnderReview(disputeId);
      setDisputes(prev => prev.map(d =>
        d.id === disputeId ? { ...d, status: 'UNDER_REVIEW' as Dispute['status'] } : d
      ));
    } catch {
      setError('No se pudo actualizar la disputa');
    }
  };

  const handleResolve = async () => {
    if (!selectedDispute || !resolutionForm.resolutionDescription) return;

    setResolving(true);
    try {
      await adminDisputesApi.resolve(selectedDispute, {
        resolution: resolutionForm.resolution,
        resolutionDescription: resolutionForm.resolutionDescription,
        refundPercentage: resolutionForm.resolution === 'RESOLVED_PARTIAL_REFUND'
          ? resolutionForm.refundPercentage
          : undefined,
        favoredParty: resolutionForm.favoredParty || undefined,
      });

      setDisputes(prev => prev.map(d =>
        d.id === selectedDispute ? { ...d, status: resolutionForm.resolution as Dispute['status'] } : d
      ));
      setSelectedDispute(null);
      setResolutionForm({
        resolution: 'RESOLVED_REFUND',
        resolutionDescription: '',
        refundPercentage: 100,
        favoredParty: '',
      });
    } catch {
      setError('No se pudo resolver la disputa');
    } finally {
      setResolving(false);
    }
  };

  const handleExportCsv = () => {
    const url = adminDisputesApi.exportCsvUrl({
      status: filter || undefined,
      reason: reasonFilter || undefined,
    });
    window.open(url, '_blank');
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
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">Abiertas</p>
            <p className="text-2xl font-bold text-accent">{stats.byStatus.OPEN || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">En revision</p>
            <p className="text-2xl font-bold text-secondary">{stats.byStatus.UNDER_REVIEW || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">Ultimos 30 dias</p>
            <p className="text-2xl font-bold text-gray-900">{stats.last30Days}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">Total reembolsado</p>
            <p className="text-2xl font-bold text-emerald">{stats.totalRefunded.toFixed(2)}&euro;</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 space-y-3">
        {/* Status tabs */}
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
        {/* Advanced filters row */}
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="text"
            placeholder="Buscar por nombre, experiencia..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-transparent"
          />
          <select
            value={reasonFilter}
            onChange={(e) => { setReasonFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
            <option value="">Todos los motivos</option>
            {Object.entries(disputeReasonLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            CSV
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
          <>
            {/* Vista movil - Tarjetas */}
            <div className="md:hidden space-y-3 p-4">
              {disputes.map((dispute) => {
                const config = disputeStatusConfig[dispute.status] || disputeStatusConfig.OPEN;
                const canResolve = ['OPEN', 'UNDER_REVIEW'].includes(dispute.status);

                return (
                  <div key={dispute.id} className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                    {/* Header con ID y Estado */}
                    <div className="flex items-center justify-between">
                      <Link href={`/admin/disputes/${dispute.id}`} className="text-sm font-mono text-primary hover:underline">
                        #{dispute.id.slice(0, 8)}
                      </Link>
                      <span className={`text-xs px-2 py-1 rounded-full ${config.bg} ${config.text}`}>
                        {config.label}
                      </span>
                    </div>

                    {/* Experiencia */}
                    <div>
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">
                        {dispute.match.experience.title}
                      </p>
                      <p className="text-xs text-gray-500">{dispute.match.experience.city}</p>
                    </div>

                    {/* Partes involucradas */}
                    <div className="flex items-center gap-3 py-2 border-t border-b border-gray-100">
                      <div className="flex items-center gap-2 flex-1">
                        <OptimizedAvatar
                          src={getAvatarUrl(dispute.openedBy?.avatar)}
                          name={dispute.openedBy?.name ?? 'Usuario'}
                          size="sm"
                        />
                        <span className="text-xs text-gray-600 truncate">{dispute.openedBy?.name ?? 'Usuario'}</span>
                      </div>
                      <span className="text-xs text-gray-400">vs</span>
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <span className="text-xs text-gray-600 truncate">{dispute.respondent?.name ?? 'Usuario'}</span>
                        <OptimizedAvatar
                          src={getAvatarUrl(dispute.respondent?.avatar)}
                          name={dispute.respondent?.name ?? 'Usuario'}
                          size="sm"
                        />
                      </div>
                    </div>

                    {/* Info adicional */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="px-2 py-1 bg-gray-100 rounded text-gray-600">
                        {disputeReasonLabels[dispute.reason] || dispute.reason}
                      </span>
                      <span className="text-gray-500">{formatDate(dispute.createdAt)}</span>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2 pt-2">
                      <Link
                        href={`/admin/disputes/${dispute.id}`}
                        className="flex-1 py-2 text-center text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                      >
                        Ver detalles
                      </Link>
                      {dispute.status === 'OPEN' && (
                        <button
                          onClick={() => handleMarkUnderReview(dispute.id)}
                          className="flex-1 py-2 text-xs font-medium text-secondary bg-secondary/10 rounded-lg hover:bg-secondary/20"
                        >
                          Revisar
                        </button>
                      )}
                      {canResolve && (
                        <button
                          onClick={() => setSelectedDispute(dispute.id)}
                          className="flex-1 py-2 text-xs font-medium text-white bg-emerald rounded-lg hover:bg-emerald/80"
                        >
                          Resolver
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Vista desktop - Tabla */}
            <div className="hidden md:block overflow-x-auto">
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
                    const config = disputeStatusConfig[dispute.status] || disputeStatusConfig.OPEN;
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
                              src={getAvatarUrl(dispute.openedBy?.avatar)}
                              name={dispute.openedBy?.name ?? 'Usuario'}
                              size="sm"
                            />
                            <span className="text-xs text-gray-400">vs</span>
                            <OptimizedAvatar
                              src={getAvatarUrl(dispute.respondent?.avatar)}
                              name={dispute.respondent?.name ?? 'Usuario'}
                              size="sm"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                            {disputeReasonLabels[dispute.reason] || dispute.reason}
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
                                className="px-3 py-1.5 text-xs font-medium text-secondary bg-secondary/10 rounded-lg hover:bg-secondary/20"
                              >
                                Revisar
                              </button>
                            )}
                            {canResolve && (
                              <button
                                onClick={() => setSelectedDispute(dispute.id)}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-emerald rounded-lg hover:bg-emerald/80"
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
          </>
        )}

        <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-transparent"
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

              {['RESOLVED_REFUND', 'RESOLVED_PARTIAL_REFUND'].includes(resolutionForm.resolution) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beneficiario del reembolso
                  </label>
                  <select
                    value={resolutionForm.favoredParty}
                    onChange={(e) => setResolutionForm({ ...resolutionForm, favoredParty: e.target.value as '' | 'opener' | 'respondent' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                  >
                    <option value="">Viajero (por defecto)</option>
                    <option value="opener">Quien abrio la disputa</option>
                    <option value="respondent">Demandado</option>
                  </select>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-transparent resize-none"
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
                className="flex-1 px-4 py-2 text-white bg-emerald rounded-lg hover:bg-emerald/80 disabled:opacity-50"
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

/* ══════════════════════════════════════════════════════════════════════════
   REPORTES CONTENT
   ══════════════════════════════════════════════════════════════════════════ */

const reportReasonLabels: Record<string, string> = {
  spam: 'Spam',
  inappropriate: 'Contenido inapropiado',
  fraud: 'Fraude',
  harassment: 'Acoso',
  other: 'Otro',
};

const reportStatusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-accent/10 text-accent-dark' },
  reviewed: { label: 'En revision', color: 'bg-secondary/10 text-secondary' },
  resolved: { label: 'Resuelto', color: 'bg-emerald/10 text-emerald' },
  dismissed: { label: 'Desestimado', color: 'bg-gray-100 text-gray-600' },
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-amber-500',
  low: 'border-l-gray-300',
};

const PRIORITY_BADGES: Record<string, { label: string; color: string }> = {
  high: { label: 'Alta', color: 'bg-primary/10 text-primary' },
  medium: { label: 'Media', color: 'bg-accent/10 text-accent-dark' },
  low: { label: 'Baja', color: 'bg-gray-100 text-gray-600' },
};

const TYPE_LABELS: Record<string, string> = {
  user: 'Usuario',
  experience: 'Experiencia',
  match: 'Reserva',
};

const ACTIONS: Record<string, { label: string; color: string; description: string }> = {
  none: { label: 'Sin accion', color: 'bg-gray-100 text-gray-700', description: 'Solo marcar como resuelto' },
  warning: { label: 'Advertencia', color: 'bg-accent/10 text-accent-dark', description: 'Enviar advertencia al usuario' },
  strike: { label: 'Falta', color: 'bg-terracotta/10 text-terracotta', description: 'Anadir una falta (3 = bloqueo)' },
  ban: { label: 'Bloqueo', color: 'bg-primary/10 text-primary', description: 'Bloquear usuario inmediatamente' },
  remove_content: { label: 'Eliminar', color: 'bg-secondary/10 text-secondary', description: 'Eliminar contenido denunciado' },
};

// Extended Report type with priority
interface ExtendedReport extends Report {
  priority?: 'low' | 'medium' | 'high';
  reportedEntity?: {
    id?: string;
    name?: string;
    email?: string;
    title?: string;
    city?: string;
    strikes?: number;
    bannedAt?: string | null;
    published?: boolean;
    status?: string;
    host?: { id: string; name: string };
  };
}

function ReportesContent() {
  const toast = useToast();
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState<ExtendedReport | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    status: 'pending',
    reportedType: '',
    reason: '',
    priority: '' as '' | 'low' | 'medium' | 'high',
  });

  // Resolution form
  const [resolution, setResolution] = useState({
    status: 'resolved' as 'resolved' | 'dismissed',
    action: 'none' as 'none' | 'warning' | 'strike' | 'ban' | 'remove_content',
    adminNotes: '',
  });

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const [reportsData, statsData] = await Promise.all([
        reportsApi.getAdvanced(page, 20, {
          status: filters.status || undefined,
          reportedType: filters.reportedType || undefined,
          reason: filters.reason || undefined,
          priority: filters.priority || undefined,
        }),
        reportsApi.getStats(),
      ]);
      setData(reportsData);
      setStats(statsData);
      setError('');
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 403) {
        setError('No tienes permisos de administrador');
      } else {
        setError('Error al cargar denuncias');
      }
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchReports();
  }, [page, filters, fetchReports]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleQuickAction = async (report: ExtendedReport, action: 'review' | 'resolve' | 'dismiss') => {
    if (action === 'review') {
      setActionLoading(report.id);
      try {
        await reportsApi.updateStatus(report.id, 'reviewed');
        fetchReports();
      } catch {
        toast.error('Error', 'No se pudo actualizar el estado');
      } finally {
        setActionLoading(null);
      }
      return;
    }

    setActionLoading(report.id);
    try {
      await reportsApi.resolve(report.id, {
        status: action === 'resolve' ? 'resolved' : 'dismissed',
        action: 'none',
        adminNotes: action === 'dismiss' ? 'Desestimado sin accion' : 'Resuelto sin accion adicional',
      });
      fetchReports();
    } catch {
      toast.error('Error', 'No se pudo actualizar la denuncia');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolve = async () => {
    if (!showResolveModal) return;

    setActionLoading(showResolveModal.id);
    try {
      await reportsApi.resolve(showResolveModal.id, {
        status: resolution.status,
        action: resolution.action,
        adminNotes: resolution.adminNotes,
      });
      setShowResolveModal(null);
      setResolution({ status: 'resolved', action: 'none', adminNotes: '' });
      fetchReports();
    } catch {
      toast.error('Error', 'No se pudo resolver la denuncia');
    } finally {
      setActionLoading(null);
    }
  };

  const renderReportedEntity = (report: ExtendedReport) => {
    const entity = report.reportedEntity;
    if (!entity) return <span className="text-gray-400 italic">Entidad eliminada</span>;

    if (report.reportedType === 'user') {
      return (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">
              {(entity.name || 'U').charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="font-medium text-gray-900">{entity.name || 'Usuario'}</div>
            {entity.email && <div className="text-xs text-gray-400">{entity.email}</div>}
          </div>
          <div className="flex gap-1 ml-auto">
            {entity.strikes !== undefined && entity.strikes > 0 && (
              <span className="text-xs px-1.5 py-0.5 bg-accent/10 text-accent-dark rounded">
                {entity.strikes}/3
              </span>
            )}
            {entity.bannedAt && (
              <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                Baneado
              </span>
            )}
          </div>
        </div>
      );
    }

    if (report.reportedType === 'experience') {
      return (
        <div>
          <div className="font-medium text-gray-900">{entity.title || 'Experiencia'}</div>
          <div className="text-xs text-gray-400">
            {entity.city && `${entity.city} - `}
            {entity.host && `Anfitrion: ${entity.host.name}`}
          </div>
        </div>
      );
    }

    if (report.reportedType === 'match') {
      return (
        <div>
          <div className="font-medium text-gray-900">Reserva #{report.reportedId.slice(-8)}</div>
          <div className="text-xs text-gray-400">Estado: {entity.status}</div>
        </div>
      );
    }

    return <span className="text-gray-400">Desconocido</span>;
  };

  if (error && !data) {
    return (
      <div className="flex items-center justify-center p-4 py-16">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md text-center">
          <div className="text-5xl mb-4">&#128683;</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link href="/admin" className="text-blue-600 font-medium">
            Volver al panel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Filter Toggle Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            showFilters ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 inline mr-1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
          </svg>
          Filtros
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <button
            onClick={() => handleFilterChange('status', 'pending')}
            className={`p-3 rounded-xl text-center transition-all ${
              filters.status === 'pending' ? 'bg-accent text-white shadow-lg scale-105' : 'bg-white shadow-sm hover:shadow'
            }`}
          >
            <div className="text-2xl font-bold">{stats.pending}</div>
            <div className="text-xs opacity-80">Pendientes</div>
          </button>
          <button
            onClick={() => handleFilterChange('status', 'reviewed')}
            className={`p-3 rounded-xl text-center transition-all ${
              filters.status === 'reviewed' ? 'bg-secondary text-white shadow-lg scale-105' : 'bg-white shadow-sm hover:shadow'
            }`}
          >
            <div className="text-2xl font-bold">{stats.reviewed}</div>
            <div className="text-xs opacity-80">En revision</div>
          </button>
          <button
            onClick={() => handleFilterChange('status', 'resolved')}
            className={`p-3 rounded-xl text-center transition-all ${
              filters.status === 'resolved' ? 'bg-emerald text-white shadow-lg scale-105' : 'bg-white shadow-sm hover:shadow'
            }`}
          >
            <div className="text-2xl font-bold">{stats.resolved}</div>
            <div className="text-xs opacity-80">Resueltos</div>
          </button>
          <button
            onClick={() => handleFilterChange('status', 'dismissed')}
            className={`p-3 rounded-xl text-center transition-all ${
              filters.status === 'dismissed' ? 'bg-gray-500 text-white shadow-lg scale-105' : 'bg-white shadow-sm hover:shadow'
            }`}
          >
            <div className="text-2xl font-bold">{stats.dismissed}</div>
            <div className="text-xs opacity-80">Desestimados</div>
          </button>
          <button
            onClick={() => handleFilterChange('status', '')}
            className={`p-3 rounded-xl text-center transition-all ${
              filters.status === '' ? 'bg-secondary text-white shadow-lg scale-105' : 'bg-white shadow-sm hover:shadow'
            }`}
          >
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs opacity-80">Total</div>
          </button>
        </div>
      )}

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-900">Filtros Avanzados</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Type Filter */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Tipo de reporte</label>
              <select
                value={filters.reportedType}
                onChange={(e) => handleFilterChange('reportedType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="">Todos</option>
                <option value="user">Usuario</option>
                <option value="experience">Experiencia</option>
                <option value="match">Reserva</option>
              </select>
            </div>

            {/* Reason Filter */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Motivo</label>
              <select
                value={filters.reason}
                onChange={(e) => handleFilterChange('reason', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="">Todos</option>
                <option value="spam">Spam</option>
                <option value="inappropriate">Contenido inapropiado</option>
                <option value="fraud">Fraude</option>
                <option value="harassment">Acoso</option>
                <option value="other">Otro</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Prioridad</label>
              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value as '' | 'low' | 'medium' | 'high')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="">Todas</option>
                <option value="high">Alta (urgente)</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>

            {/* Status Filter (in filter panel) */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Estado</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="">Todos</option>
                <option value="pending">Pendiente</option>
                <option value="reviewed">En revision</option>
                <option value="resolved">Resuelto</option>
                <option value="dismissed">Desestimado</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => {
              setFilters({ status: 'pending', reportedType: '', reason: '', priority: '' });
              setPage(1);
            }}
            className="text-sm text-primary font-medium"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="spinner spinner-lg" />
        </div>
      )}

      {/* Reports List */}
      {!loading && data && (
        <div className="space-y-3">
          {(data.reports as ExtendedReport[]).map((report) => {
            const statusInfo = reportStatusLabels[report.status];
            const priorityInfo = report.priority ? PRIORITY_BADGES[report.priority] : null;

            return (
              <div
                key={report.id}
                className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${
                  report.priority ? PRIORITY_COLORS[report.priority] : 'border-l-gray-200'
                }`}
              >
                {/* Header Row */}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                  {priorityInfo && (
                    <span className={`px-2 py-0.5 text-xs rounded-full ${priorityInfo.color}`}>
                      Prioridad {priorityInfo.label}
                    </span>
                  )}
                  <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                    {TYPE_LABELS[report.reportedType]}
                  </span>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                    {reportReasonLabels[report.reason] || report.reason}
                  </span>
                  <span className="ml-auto text-xs text-gray-400">
                    {new Date(report.createdAt).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Reported Entity */}
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <div className="text-xs text-gray-400 mb-1">Elemento reportado:</div>
                  {renderReportedEntity(report)}
                </div>

                {/* Description */}
                {report.description && (
                  <div className="text-sm text-gray-600 mb-3 p-3 bg-amber-50 rounded-lg border-l-2 border-amber-400">
                    <div className="text-xs text-accent mb-1 font-medium">Descripcion de la denuncia:</div>
                    {report.description}
                  </div>
                )}

                {/* Reporter Info */}
                <div className="text-xs text-gray-400 mb-3">
                  Denunciado por: <span className="font-medium">{report.reporter?.name || 'Usuario anonimo'}</span>
                  {report.reporter?.email && ` (${report.reporter.email})`}
                </div>

                {/* Admin Notes */}
                {report.adminNotes && (
                  <div className="text-xs bg-secondary/5 text-secondary p-2 rounded-lg mb-3">
                    <strong>Notas admin:</strong> {report.adminNotes}
                  </div>
                )}

                {/* Actions */}
                {(report.status === 'pending' || report.status === 'reviewed') && (
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    {report.status === 'pending' && (
                      <button
                        onClick={() => handleQuickAction(report, 'review')}
                        disabled={actionLoading === report.id}
                        className="flex-1 py-2 bg-secondary/10 text-secondary text-sm font-medium rounded-lg hover:bg-secondary/20 transition-colors disabled:opacity-50"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 inline mr-1">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                        Revisar
                      </button>
                    )}
                    <button
                      onClick={() => setShowResolveModal(report)}
                      disabled={actionLoading === report.id}
                      className="flex-1 py-2 bg-emerald/10 text-emerald text-sm font-medium rounded-lg hover:bg-emerald/20 transition-colors disabled:opacity-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 inline mr-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      Resolver
                    </button>
                    <button
                      onClick={() => handleQuickAction(report, 'dismiss')}
                      disabled={actionLoading === report.id}
                      className="flex-1 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 inline mr-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                      Desestimar
                    </button>
                  </div>
                )}

                {report.resolvedAt && (
                  <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
                    Resuelto el {new Date(report.resolvedAt).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && data && data.reports.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <div className="text-4xl mb-4">&#9989;</div>
          <p className="text-gray-500 font-medium">No hay denuncias con estos filtros</p>
          <p className="text-gray-400 text-sm mt-1">Prueba cambiando los filtros o vuelve mas tarde</p>
        </div>
      )}

      {data && <AdminPagination page={page} totalPages={data.pagination.pages} onPageChange={setPage} />}

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-gray-900 text-lg">Resolver denuncia</h3>
                <button
                  onClick={() => setShowResolveModal(null)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Report Summary */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="text-xs text-gray-500 mb-2">Denuncia contra:</div>
                {renderReportedEntity(showResolveModal)}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-500">Motivo:</div>
                  <div className="font-medium text-gray-900">
                    {reportReasonLabels[showResolveModal.reason] || showResolveModal.reason}
                  </div>
                </div>
                {showResolveModal.description && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-500">Descripcion:</div>
                    <div className="text-sm text-gray-600">{showResolveModal.description}</div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {/* Resolution Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de resolucion
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setResolution(prev => ({ ...prev, status: 'resolved' }))}
                      className={`flex-1 py-2.5 px-3 rounded-lg font-medium transition-colors border-2 ${
                        resolution.status === 'resolved'
                          ? 'bg-emerald text-white border-emerald'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-green-300'
                      }`}
                    >
                      Resuelto
                    </button>
                    <button
                      onClick={() => setResolution(prev => ({ ...prev, status: 'dismissed', action: 'none' }))}
                      className={`flex-1 py-2.5 px-3 rounded-lg font-medium transition-colors border-2 ${
                        resolution.status === 'dismissed'
                          ? 'bg-gray-500 text-white border-gray-500'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      Desestimado
                    </button>
                  </div>
                </div>

                {/* Action to take - only for 'resolved' and user reports */}
                {showResolveModal.reportedType === 'user' && resolution.status === 'resolved' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Accion a tomar contra el usuario
                    </label>
                    <div className="space-y-2">
                      {Object.entries(ACTIONS).map(([key, { label, color, description }]) => (
                        <button
                          key={key}
                          onClick={() => setResolution(prev => ({ ...prev, action: key as typeof prev.action }))}
                          className={`w-full py-3 px-4 rounded-lg text-left transition-colors border-2 ${
                            resolution.action === key
                              ? 'border-secondary ' + color
                              : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{label}</span>
                            {resolution.action === key && (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-secondary">
                                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">{description}</div>
                        </button>
                      ))}
                    </div>
                    {resolution.action === 'strike' && (
                      <p className="text-xs text-accent mt-2 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                        </svg>
                        Con 3 faltas el usuario sera bloqueado automaticamente.
                      </p>
                    )}
                    {resolution.action === 'ban' && (
                      <p className="text-xs text-primary mt-2 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                        </svg>
                        El usuario sera baneado inmediatamente.
                      </p>
                    )}
                  </div>
                )}

                {/* Admin Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas internas (opcional)
                  </label>
                  <textarea
                    value={resolution.adminNotes}
                    onChange={(e) => setResolution(prev => ({ ...prev, adminNotes: e.target.value }))}
                    placeholder="Notas sobre la resolucion para otros admins..."
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-secondary/50"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowResolveModal(null);
                      setResolution({ status: 'resolved', action: 'none', adminNotes: '' });
                    }}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleResolve}
                    disabled={actionLoading === showResolveModal.id}
                    className={`flex-1 py-3 font-medium rounded-xl transition-colors disabled:opacity-50 ${
                      resolution.status === 'resolved'
                        ? 'bg-emerald text-white hover:bg-emerald/80'
                        : 'bg-gray-500 text-white hover:bg-gray-600'
                    }`}
                  >
                    {actionLoading === showResolveModal.id ? 'Procesando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   VERIFICACIONES CONTENT
   ══════════════════════════════════════════════════════════════════════════ */

type VerificationFilterStatus = 'PENDING' | 'VERIFIED' | 'ALL';

interface VerificationListItem {
  id: string;
  status: 'PENDING' | 'VERIFIED';
  documentType: string | null;
  attempts: number;
  createdAt: string;
  hasDocuments: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

interface VerificationStats {
  pending: number;
  verified: number;
  rejected: number;
  total: number;
  approvalRate: number;
}

const verificationStatusConfig = {
  PENDING: { label: 'Pendiente', color: 'text-accent-dark', bgColor: 'bg-accent/10' },
  VERIFIED: { label: 'Verificado', color: 'text-emerald', bgColor: 'bg-emerald/10' },
};

function VerificacionesContent() {
  const toast = useToast();

  const [verifications, setVerifications] = useState<VerificationListItem[]>([]);
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<VerificationFilterStatus>('PENDING');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get<VerificationStats>('/verification/admin/stats');
      setStats(response.data);
    } catch {
      // Ignore
    }
  }, []);

  const fetchVerifications = useCallback(async (reset = false) => {
    try {
      const currentPage = reset ? 1 : page;
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });
      if (filter !== 'ALL') {
        params.append('status', filter);
      }

      const response = await api.get<{
        verifications: VerificationListItem[];
        total: number;
        hasMore: boolean;
      }>(`/verification/admin?${params}`);

      if (reset) {
        setVerifications(response.data.verifications);
        setPage(1);
      } else {
        setVerifications((prev) => [...prev, ...response.data.verifications]);
      }
      setTotal(response.data.total);
      setHasMore(response.data.hasMore);
    } catch {
      toast.error('Error', 'No se pudieron cargar las verificaciones');
    } finally {
      setLoading(false);
    }
  }, [filter, page, toast]);

  useEffect(() => {
    fetchStats();
    fetchVerifications(true);
  }, [fetchStats, fetchVerifications]);

  useEffect(() => {
    setLoading(true);
    fetchVerifications(true);
  }, [filter, fetchVerifications]);

  const handleToggleVerification = async (userId: string, currentlyVerified: boolean) => {
    const newStatus = !currentlyVerified;
    const action = newStatus ? 'verificar' : 'desverificar';

    setProcessing(userId);
    try {
      await api.put(`/verification/admin/${userId}/toggle`, { verified: newStatus });
      toast.success(
        newStatus ? 'Verificado' : 'Desverificado',
        `Usuario ${action === 'verificar' ? 'verificado' : 'desverificado'} correctamente`,
      );
      fetchStats();
      fetchVerifications(true);
    } catch {
      toast.error('Error', `No se pudo ${action} al usuario`);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
            <p className="text-2xl font-bold text-accent">{stats.pending}</p>
            <p className="text-xs text-gray-500">Sin verificar</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
            <p className="text-2xl font-bold text-emerald">{stats.verified}</p>
            <p className="text-xs text-gray-500">Verificados</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
            <p className="text-2xl font-bold text-primary">{stats.approvalRate}%</p>
            <p className="text-xs text-gray-500">Tasa verificacion</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['PENDING', 'VERIFIED', 'ALL'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === status
                ? 'bg-primary text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {status === 'ALL' ? 'Todos' : status === 'PENDING' ? 'Sin verificar' : 'Verificados'}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {verifications.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p className="text-gray-500">No hay usuarios {filter === 'PENDING' ? 'sin verificar' : filter === 'VERIFIED' ? 'verificados' : ''}</p>
          </div>
        ) : (
          verifications.map((v) => (
            <div
              key={v.id}
              className="w-full bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-4"
            >
              <OptimizedAvatar
                src={v.user?.avatarUrl}
                name={v.user?.name ?? 'Usuario'}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{v.user?.name ?? 'Usuario'}</p>
                <p className="text-sm text-gray-500 truncate">{v.user?.email ?? ''}</p>
                {v.hasDocuments && v.documentType && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Doc: {v.documentType === 'DNI' ? 'DNI' : v.documentType === 'PASSPORT' ? 'Pasaporte' : 'Carnet'}
                    {v.attempts > 1 && <span className="text-terracotta ml-1">({v.attempts} intentos)</span>}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${verificationStatusConfig[v.status].bgColor} ${verificationStatusConfig[v.status].color}`}>
                  {verificationStatusConfig[v.status].label}
                </span>
                <button
                  onClick={() => handleToggleVerification(v.user.id, v.status === 'VERIFIED')}
                  disabled={processing === v.user.id}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                    v.status === 'VERIFIED'
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-emerald/10 text-emerald hover:bg-emerald/20'
                  }`}
                >
                  {processing === v.user.id
                    ? '...'
                    : v.status === 'VERIFIED'
                      ? 'Desverificar'
                      : 'Verificar'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      {hasMore && (
        <button
          onClick={() => {
            setPage((p) => p + 1);
            fetchVerifications();
          }}
          className="w-full py-3 bg-white border border-gray-200 rounded-xl text-gray-600 font-medium"
        >
          Cargar mas ({total - verifications.length} restantes)
        </button>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ALERT COUNTS TYPE
   ══════════════════════════════════════════════════════════════════════════ */

interface AlertCounts {
  disputes?: { open?: number; underReview?: number; total?: number };
  reports?: { pending?: number };
  verifications?: { pending?: number };
}

/* ══════════════════════════════════════════════════════════════════════════
   PAGE TITLE MAP
   ══════════════════════════════════════════════════════════════════════════ */

const TAB_TITLES: Record<string, string> = {
  disputas: 'Disputas',
  reportes: 'Denuncias',
  verificaciones: 'Verificaciones de Identidad',
};

/* ══════════════════════════════════════════════════════════════════════════
   MODERACION PAGE INNER
   ══════════════════════════════════════════════════════════════════════════ */

function ModeracionPageInner() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTab = searchParams.get('tab') || 'disputas';
  const [alerts, setAlerts] = useState<AlertCounts | null>(null);

  // Auth check
  useEffect(() => {
    if (!authLoading && user && user.role !== 'admin') {
      router.push('/dashboard');
    }
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch alerts
  useEffect(() => {
    let cancelled = false;
    api.get('/admin/dashboard/alerts')
      .then(({ data }) => { if (!cancelled) setAlerts(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  const layoutAlerts = alerts
    ? {
        disputes: alerts.disputes?.total ?? 0,
        reports: alerts.reports?.pending ?? 0,
        verifications: alerts.verifications?.pending ?? 0,
      }
    : undefined;

  return (
    <AdminLayout
      section="moderacion"
      title={TAB_TITLES[activeTab] || 'Moderacion'}
      alerts={layoutAlerts}
    >
      {activeTab === 'disputas' && <DisputasContent />}
      {activeTab === 'reportes' && <ReportesContent />}
      {activeTab === 'verificaciones' && <VerificacionesContent />}
    </AdminLayout>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   EXPORTED PAGE
   ══════════════════════════════════════════════════════════════════════════ */

export default function ModeracionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#FF6B35', borderTopColor: 'transparent' }} />
        </div>
      }
    >
      <ModeracionPageInner />
    </Suspense>
  );
}
