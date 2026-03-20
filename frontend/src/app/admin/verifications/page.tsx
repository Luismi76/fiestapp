'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import { AdminHeader } from '@/components/admin';
import AdminNav from '@/components/admin/AdminNav';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import api from '@/lib/api';
import OptimizedAvatar from '@/components/OptimizedAvatar';

type FilterStatus = 'PENDING' | 'VERIFIED' | 'ALL';

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

const statusConfig = {
  PENDING: { label: 'Pendiente', color: 'text-accent-dark', bgColor: 'bg-accent/10' },
  VERIFIED: { label: 'Verificado', color: 'text-emerald', bgColor: 'bg-emerald/10' },
};

export default function AdminVerificationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const [verifications, setVerifications] = useState<VerificationListItem[]>([]);
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('PENDING');
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
    if (!authLoading && user) {
      if (user.role !== 'admin') {
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
    if (!authLoading && user?.role === 'admin') {
      setLoading(true);
      fetchVerifications(true);
    }
  }, [filter, authLoading, user, fetchVerifications]);

  const handleToggleVerification = async (userId: string, currentlyVerified: boolean) => {
    const newStatus = !currentlyVerified;
    const action = newStatus ? 'verificar' : 'desverificar';

    if (!confirm(`¿${newStatus ? 'Verificar' : 'Desverificar'} a este usuario?`)) return;

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

  if (authLoading || loading) {
    return (
      <MainLayout hideNav>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout hideNav>
      <div className="min-h-screen bg-gray-50">
        <AdminHeader title="Verificaciones de Identidad" />
        <AdminNav />

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
                <p className="text-xs text-gray-500">Tasa verificación</p>
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
                    src={v.user.avatarUrl}
                    name={v.user.name}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{v.user.name}</p>
                    <p className="text-sm text-gray-500 truncate">{v.user.email}</p>
                    {v.hasDocuments && v.documentType && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Doc: {v.documentType === 'DNI' ? 'DNI' : v.documentType === 'PASSPORT' ? 'Pasaporte' : 'Carnet'}
                        {v.attempts > 1 && <span className="text-terracotta ml-1">({v.attempts} intentos)</span>}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[v.status].bgColor} ${statusConfig[v.status].color}`}>
                      {statusConfig[v.status].label}
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
              Cargar más ({total - verifications.length} restantes)
            </button>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
