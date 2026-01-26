'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { reportsApi, Report, ReportsResponse, ReportStats } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/MainLayout';
import { AdminHeader } from '@/components/admin';

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  inappropriate: 'Contenido inapropiado',
  fraud: 'Fraude',
  harassment: 'Acoso',
  other: 'Otro',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-accent/10 text-accent-dark' },
  reviewed: { label: 'En revisión', color: 'bg-secondary/10 text-secondary' },
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
  none: { label: 'Sin acción', color: 'bg-gray-100 text-gray-700', description: 'Solo marcar como resuelto' },
  warning: { label: 'Advertencia', color: 'bg-accent/10 text-accent-dark', description: 'Enviar advertencia al usuario' },
  strike: { label: 'Strike', color: 'bg-terracotta/10 text-terracotta', description: 'Añadir un strike (3 = ban)' },
  ban: { label: 'Baneo', color: 'bg-primary/10 text-primary', description: 'Banear usuario inmediatamente' },
  remove_content: { label: 'Eliminar', color: 'bg-secondary/10 text-secondary', description: 'Eliminar contenido reportado' },
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

export default function AdminReportsPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
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

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

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
        setError('Error al cargar reportes');
      }
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchReports();
    }
  }, [isAuthenticated, page, filters, fetchReports]);

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
        alert('Error al actualizar estado');
      } finally {
        setActionLoading(null);
      }
      return;
    }

    const confirmMsg = action === 'resolve'
      ? 'Marcar reporte como resuelto sin acción?'
      : 'Desestimar este reporte?';

    if (!confirm(confirmMsg)) return;

    setActionLoading(report.id);
    try {
      await reportsApi.resolve(report.id, {
        status: action === 'resolve' ? 'resolved' : 'dismissed',
        action: 'none',
        adminNotes: action === 'dismiss' ? 'Desestimado sin acción' : 'Resuelto sin acción adicional',
      });
      fetchReports();
    } catch {
      alert('Error al actualizar reporte');
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
      alert('Error al resolver reporte');
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
            {entity.host && `Host: ${entity.host.name}`}
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
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
    <MainLayout>
      <div className="min-h-screen bg-gray-50 pb-8">
        <AdminHeader
          title="Reportes y Denuncias"
          showFilterButton
          filterActive={showFilters}
          onFilterToggle={() => setShowFilters(!showFilters)}
        />

      <div className="p-4 space-y-4">
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
              <div className="text-xs opacity-80">En revisión</div>
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
                  <option value="reviewed">En revisión</option>
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
              const statusInfo = STATUS_LABELS[report.status];
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
                      {REASON_LABELS[report.reason] || report.reason}
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
                      <div className="text-xs text-accent mb-1 font-medium">Descripción del reporte:</div>
                      {report.description}
                    </div>
                  )}

                  {/* Reporter Info */}
                  <div className="text-xs text-gray-400 mb-3">
                    Reportado por: <span className="font-medium">{report.reporter?.name || 'Usuario anónimo'}</span>
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
            <p className="text-gray-500 font-medium">No hay reportes con estos filtros</p>
            <p className="text-gray-400 text-sm mt-1">Prueba cambiando los filtros o vuelve más tarde</p>
          </div>
        )}

        {/* Pagination */}
        {data && data.pagination.pages > 1 && (
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="px-4 py-2 text-gray-600">
              Página {page} de {data.pagination.pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.pagination.pages, p + 1))}
              disabled={page === data.pagination.pages}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-gray-900 text-lg">Resolver Reporte</h3>
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
                <div className="text-xs text-gray-500 mb-2">Reporte contra:</div>
                {renderReportedEntity(showResolveModal)}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-500">Motivo:</div>
                  <div className="font-medium text-gray-900">
                    {REASON_LABELS[showResolveModal.reason] || showResolveModal.reason}
                  </div>
                </div>
                {showResolveModal.description && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-500">Descripción:</div>
                    <div className="text-sm text-gray-600">{showResolveModal.description}</div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {/* Resolution Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de resolución
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
                      Acción a tomar contra el usuario
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
                        Con 3 strikes el usuario será baneado automáticamente.
                      </p>
                    )}
                    {resolution.action === 'ban' && (
                      <p className="text-xs text-primary mt-2 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                        </svg>
                        El usuario será baneado inmediatamente.
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
                    placeholder="Notas sobre la resolución para otros admins..."
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
                    {actionLoading === showResolveModal.id ? 'Procesando...' : 'Confirmar Resolución'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </MainLayout>
  );
}
