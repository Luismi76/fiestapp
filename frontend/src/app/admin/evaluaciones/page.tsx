'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { evaluationsApi, Evaluation } from '@/lib/api';
import MainLayout from '@/components/MainLayout';
import { AdminHeader } from '@/components/admin';
import AdminNav from '@/components/admin/AdminNav';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  PENDIENTE: { label: 'Pendiente', color: '#E6A817', bg: '#FEF9E7' },
  EN_REVISION: { label: 'En revision', color: '#1E5F8C', bg: '#EBF4FA' },
  RESUELTO: { label: 'Resuelto', color: '#0D7355', bg: '#E8F5F0' },
  DESCARTADO: { label: 'Descartado', color: '#6B7280', bg: '#F3F4F6' },
};

const CATEGORY_LABELS: Record<string, string> = {
  PROBLEMA: 'Problema',
  MEJORA: 'Mejora',
  OPINION: 'Opinión',
};

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  BAJA: { label: 'Baja', color: '#0D7355' },
  MEDIA: { label: 'Media', color: '#E6A817' },
  ALTA: { label: 'Alta', color: '#C41E3A' },
};

export default function AdminEvaluacionesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchEvaluations = useCallback(async () => {
    setLoading(true);
    try {
      const result = await evaluationsApi.getAll({
        status: filterStatus || undefined,
        category: filterCategory || undefined,
        page,
        limit: 20,
      });
      setEvaluations(result.data);
      setTotalPages(result.meta.totalPages);
      setTotal(result.meta.total);
    } catch {
      // Si no es admin, redirigir
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterCategory, page]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchEvaluations();
    }
  }, [authLoading, user, fetchEvaluations]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      await evaluationsApi.update(id, { status: newStatus });
      setEvaluations(prev =>
        prev.map(e => (e.id === id ? { ...e, status: newStatus as Evaluation['status'] } : e)),
      );
    } catch {
      // Error silencioso
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta evaluación?')) return;
    try {
      await evaluationsApi.delete(id);
      setEvaluations(prev => prev.filter(e => e.id !== id));
      setTotal(prev => prev - 1);
    } catch {
      // Error silencioso
    }
  };

  if (authLoading) {
    return (
      <MainLayout hideNav>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout hideNav>
      <div className="min-h-screen bg-gray-50">
        <AdminHeader title={`Evaluaciones (${total})`} />
        <AdminNav />

        <div className="max-w-4xl mx-auto p-4 space-y-4">
          {/* Filtros */}
          <div className="flex gap-2 flex-wrap">
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="input py-2 px-3 text-sm"
            >
              <option value="">Todos los estados</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="EN_REVISION">En revision</option>
              <option value="RESUELTO">Resuelto</option>
              <option value="DESCARTADO">Descartado</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
              className="input py-2 px-3 text-sm"
            >
              <option value="">Todas las categorías</option>
              <option value="PROBLEMA">Problemas</option>
              <option value="MEJORA">Mejoras</option>
              <option value="OPINION">Opiniones</option>
            </select>
          </div>

          {/* Lista */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : evaluations.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500">No hay evaluaciones{filterStatus || filterCategory ? ' con estos filtros' : ''}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {evaluations.map((evaluation) => {
                const status = STATUS_LABELS[evaluation.status];
                const priorityInfo = PRIORITY_LABELS[evaluation.priority];
                const isExpanded = expandedId === evaluation.id;

                return (
                  <div
                    key={evaluation.id}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                  >
                    {/* Cabecera clickable */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : evaluation.id)}
                      className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span
                              className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                              style={{ color: status.color, backgroundColor: status.bg }}
                            >
                              {status.label}
                            </span>
                            <span className="text-xs text-gray-400">
                              {CATEGORY_LABELS[evaluation.category]}
                            </span>
                            <span
                              className="text-xs font-semibold"
                              style={{ color: priorityInfo.color }}
                            >
                              {priorityInfo.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 line-clamp-2">{evaluation.comment}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {evaluation.evaluatorName} &middot; {evaluation.page} &middot;{' '}
                            {new Date(evaluation.createdAt).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className={`w-5 h-5 text-gray-300 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                        >
                          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </button>

                    {/* Detalle expandido */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-50 space-y-3">
                        <div className="pt-3">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{evaluation.comment}</p>
                        </div>

                        {/* Cambiar estado */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-500 font-medium">Estado:</span>
                          {Object.entries(STATUS_LABELS).map(([key, val]) => (
                            <button
                              key={key}
                              onClick={() => handleStatusChange(evaluation.id, key)}
                              disabled={updatingId === evaluation.id || evaluation.status === key}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                                evaluation.status === key
                                  ? 'border-current opacity-100'
                                  : 'border-gray-200 opacity-60 hover:opacity-100'
                              }`}
                              style={
                                evaluation.status === key
                                  ? { color: val.color, backgroundColor: val.bg, borderColor: val.color }
                                  : undefined
                              }
                            >
                              {val.label}
                            </button>
                          ))}
                        </div>

                        {/* Eliminar */}
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleDelete(evaluation.id)}
                            className="text-xs text-red-500 hover:text-red-700 transition-colors"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Paginacion */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-500">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
