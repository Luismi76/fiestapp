'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import api from '@/lib/api';
import OptimizedAvatar from '@/components/OptimizedAvatar';

type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
type DocumentType = 'DNI' | 'PASSPORT' | 'DRIVER_LICENSE';

interface VerificationListItem {
  id: string;
  status: VerificationStatus;
  documentType: DocumentType;
  attempts: number;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

interface VerificationDetail {
  id: string;
  status: VerificationStatus;
  documentType: DocumentType;
  documentFront: string;
  documentBack: string | null;
  selfie: string | null;
  rejectionReason: string | null;
  attempts: number;
  createdAt: string;
}

interface VerificationStats {
  pending: number;
  verified: number;
  rejected: number;
  total: number;
  approvalRate: number;
}

const statusConfig: Record<VerificationStatus, { label: string; color: string; bgColor: string }> = {
  PENDING: { label: 'Pendiente', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  VERIFIED: { label: 'Verificado', color: 'text-green-700', bgColor: 'bg-green-100' },
  REJECTED: { label: 'Rechazado', color: 'text-red-700', bgColor: 'bg-red-100' },
};

const documentTypeLabels: Record<DocumentType, string> = {
  DNI: 'DNI',
  PASSPORT: 'Pasaporte',
  DRIVER_LICENSE: 'Carnet',
};

export default function AdminVerificationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const [verifications, setVerifications] = useState<VerificationListItem[]>([]);
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<VerificationStatus | 'ALL'>('PENDING');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  // Detail modal state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<VerificationDetail | null>(null);
  const [detailUser, setDetailUser] = useState<VerificationListItem['user'] | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

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

  const fetchDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const response = await api.get<VerificationDetail>(`/verification/admin/${id}`);
      setDetail(response.data);
    } catch {
      toast.error('Error', 'No se pudo cargar el detalle');
      setSelectedId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role !== 'ADMIN') {
        router.push('/');
        return;
      }
      fetchStats();
      fetchVerifications(true);
    } else if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router, fetchStats, fetchVerifications]);

  useEffect(() => {
    if (!authLoading && user?.role === 'ADMIN') {
      setLoading(true);
      fetchVerifications(true);
    }
  }, [filter, authLoading, user, fetchVerifications]);

  const openDetail = (verification: VerificationListItem) => {
    setSelectedId(verification.id);
    setDetailUser(verification.user);
    setRejectionReason('');
    fetchDetail(verification.id);
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
    setDetailUser(null);
    setRejectionReason('');
  };

  const handleApprove = async () => {
    if (!selectedId) return;
    setProcessing(true);
    try {
      await api.put(`/verification/admin/${selectedId}`, {
        status: 'VERIFIED',
      });
      toast.success('Aprobado', 'La verificacion ha sido aprobada');
      closeDetail();
      fetchStats();
      fetchVerifications(true);
    } catch {
      toast.error('Error', 'No se pudo aprobar la verificacion');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedId) return;
    if (!rejectionReason.trim()) {
      toast.error('Falta motivo', 'Debes indicar el motivo del rechazo');
      return;
    }
    setProcessing(true);
    try {
      await api.put(`/verification/admin/${selectedId}`, {
        status: 'REJECTED',
        rejectionReason: rejectionReason.trim(),
      });
      toast.success('Rechazado', 'La verificacion ha sido rechazada');
      closeDetail();
      fetchStats();
      fetchVerifications(true);
    } catch {
      toast.error('Error', 'No se pudo rechazar la verificacion');
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="flex items-center gap-3 px-4 h-16">
            <button onClick={() => router.push('/admin')} className="w-10 h-10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold">Verificaciones de Identidad</h1>
          </div>
        </header>

        <div className="p-4 space-y-4">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                <p className="text-xs text-gray-500">Pendientes</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
                <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
                <p className="text-xs text-gray-500">Verificados</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                <p className="text-xs text-gray-500">Rechazados</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
                <p className="text-2xl font-bold text-primary">{stats.approvalRate}%</p>
                <p className="text-xs text-gray-500">Tasa aprobacion</p>
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(['PENDING', 'VERIFIED', 'REJECTED', 'ALL'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === status
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                {status === 'ALL' ? 'Todas' : statusConfig[status].label}
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
                <p className="text-gray-500">No hay verificaciones {filter !== 'ALL' ? statusConfig[filter].label.toLowerCase() + 's' : ''}</p>
              </div>
            ) : (
              verifications.map((v) => (
                <button
                  key={v.id}
                  onClick={() => openDetail(v)}
                  className="w-full bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-4 text-left hover:border-primary/30 transition-colors"
                >
                  <OptimizedAvatar
                    src={v.user.avatarUrl}
                    name={v.user.name}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{v.user.name}</p>
                    <p className="text-sm text-gray-500 truncate">{v.user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">
                        {documentTypeLabels[v.documentType]}
                      </span>
                      {v.attempts > 1 && (
                        <span className="text-xs text-orange-500">
                          Intento {v.attempts}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[v.status].bgColor} ${statusConfig[v.status].color}`}>
                    {statusConfig[v.status].label}
                  </span>
                </button>
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

        {/* Detail Modal */}
        {selectedId && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
            <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                <h2 className="font-semibold">Detalle de Verificacion</h2>
                <button onClick={closeDetail} className="w-8 h-8 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {loadingDetail ? (
                <div className="p-8 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : detail && detailUser ? (
                <div className="p-4 space-y-4">
                  {/* User Info */}
                  <div className="flex items-center gap-3">
                    <OptimizedAvatar
                      src={detailUser.avatarUrl}
                      name={detailUser.name}
                      size="lg"
                    />
                    <div>
                      <p className="font-semibold text-gray-900">{detailUser.name}</p>
                      <p className="text-sm text-gray-500">{detailUser.email}</p>
                    </div>
                  </div>

                  {/* Document Info */}
                  <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tipo de documento:</span>
                      <span className="font-medium">{documentTypeLabels[detail.documentType]}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Intentos:</span>
                      <span className="font-medium">{detail.attempts}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Enviado:</span>
                      <span className="font-medium">
                        {new Date(detail.createdAt).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                  </div>

                  {/* Document Images */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Parte frontal</p>
                      <img
                        src={detail.documentFront}
                        alt="Documento frontal"
                        className="w-full rounded-xl border border-gray-200"
                      />
                    </div>

                    {detail.documentBack && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Parte trasera</p>
                        <img
                          src={detail.documentBack}
                          alt="Documento trasera"
                          className="w-full rounded-xl border border-gray-200"
                        />
                      </div>
                    )}

                    {detail.selfie && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Selfie con documento</p>
                        <img
                          src={detail.selfie}
                          alt="Selfie"
                          className="w-full rounded-xl border border-gray-200"
                        />
                      </div>
                    )}
                  </div>

                  {/* Actions (only for PENDING) */}
                  {detail.status === 'PENDING' && (
                    <div className="space-y-3 pt-4 border-t border-gray-100">
                      {/* Rejection Reason */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Motivo de rechazo (si aplica)
                        </label>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Ej: El documento no es legible..."
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          rows={2}
                        />
                      </div>

                      {/* Buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={handleReject}
                          disabled={processing}
                          className="flex-1 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          Rechazar
                        </button>
                        <button
                          onClick={handleApprove}
                          disabled={processing}
                          className="flex-1 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                          Aprobar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Already reviewed */}
                  {detail.status !== 'PENDING' && (
                    <div className={`p-4 rounded-xl ${statusConfig[detail.status].bgColor}`}>
                      <p className={`font-semibold ${statusConfig[detail.status].color}`}>
                        {statusConfig[detail.status].label}
                      </p>
                      {detail.rejectionReason && (
                        <p className="text-sm text-gray-600 mt-1">
                          Motivo: {detail.rejectionReason}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
