'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { reportsApi, Report, ReportsResponse, ReportStats } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  inappropriate: 'Inapropiado',
  fraud: 'Fraude',
  harassment: 'Acoso',
  other: 'Otro',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700' },
  reviewed: { label: 'En revision', color: 'bg-blue-100 text-blue-700' },
  resolved: { label: 'Resuelto', color: 'bg-green-100 text-green-700' },
  dismissed: { label: 'Descartado', color: 'bg-gray-100 text-gray-600' },
};

export default function AdminReportsPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'pending' | 'reviewed' | 'resolved' | 'dismissed' | 'all'>('pending');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reportsData, statsData] = await Promise.all([
        reportsApi.getAll(page, 20, filter === 'all' ? undefined : filter),
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
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, page, filter]);

  const handleUpdateStatus = async (reportId: string, status: 'reviewed' | 'resolved' | 'dismissed') => {
    setActionLoading(reportId);
    try {
      await reportsApi.updateStatus(reportId, status, adminNotes || undefined);
      fetchData();
      setSelectedReport(null);
      setAdminNotes('');
    } catch {
      alert('Error al actualizar estado');
    } finally {
      setActionLoading(null);
    }
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
          <div className="text-5xl mb-4">🚫</div>
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
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="flex items-center px-4 h-14">
          <Link href="/admin" className="w-10 h-10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <span className="flex-1 text-center font-semibold text-gray-900">Gestion de Reportes</span>
          <div className="w-10" />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-white rounded-xl p-3 text-center shadow-sm">
              <div className="text-xl font-bold text-amber-600">{stats.pending}</div>
              <div className="text-xs text-gray-500">Pendientes</div>
            </div>
            <div className="bg-white rounded-xl p-3 text-center shadow-sm">
              <div className="text-xl font-bold text-blue-600">{stats.reviewed}</div>
              <div className="text-xs text-gray-500">En revision</div>
            </div>
            <div className="bg-white rounded-xl p-3 text-center shadow-sm">
              <div className="text-xl font-bold text-green-600">{stats.resolved}</div>
              <div className="text-xs text-gray-500">Resueltos</div>
            </div>
            <div className="bg-white rounded-xl p-3 text-center shadow-sm">
              <div className="text-xl font-bold text-gray-600">{stats.dismissed}</div>
              <div className="text-xs text-gray-500">Descartados</div>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['pending', 'reviewed', 'resolved', 'dismissed', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' && 'Todos'}
              {f === 'pending' && 'Pendientes'}
              {f === 'reviewed' && 'En revision'}
              {f === 'resolved' && 'Resueltos'}
              {f === 'dismissed' && 'Descartados'}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="spinner spinner-lg" />
          </div>
        )}

        {/* Reports List */}
        {!loading && data && (
          <div className="space-y-3">
            {data.reports.map((report) => (
              <div key={report.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_LABELS[report.status].color}`}>
                      {STATUS_LABELS[report.status].label}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {report.reportedType === 'user' ? 'Usuario' :
                       report.reportedType === 'experience' ? 'Experiencia' : 'Reserva'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(report.createdAt).toLocaleDateString('es-ES')}
                  </span>
                </div>

                <div className="mb-2">
                  <span className="font-medium text-gray-900">
                    {REASON_LABELS[report.reason] || report.reason}
                  </span>
                  {report.description && (
                    <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                  )}
                </div>

                <div className="text-xs text-gray-500 mb-3">
                  Reportado por: {report.reporter?.name} ({report.reporter?.email})
                </div>

                {report.adminNotes && (
                  <div className="bg-gray-50 p-2 rounded-lg text-xs text-gray-600 mb-3">
                    <strong>Notas admin:</strong> {report.adminNotes}
                  </div>
                )}

                {/* Actions */}
                {report.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateStatus(report.id, 'reviewed')}
                      disabled={actionLoading === report.id}
                      className="flex-1 py-2 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                    >
                      Revisar
                    </button>
                    <button
                      onClick={() => setSelectedReport(report)}
                      disabled={actionLoading === report.id}
                      className="flex-1 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                    >
                      Resolver
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(report.id, 'dismissed')}
                      disabled={actionLoading === report.id}
                      className="flex-1 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      Descartar
                    </button>
                  </div>
                )}

                {report.status === 'reviewed' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedReport(report)}
                      disabled={actionLoading === report.id}
                      className="flex-1 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                    >
                      Resolver
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(report.id, 'dismissed')}
                      disabled={actionLoading === report.id}
                      className="flex-1 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      Descartar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && data && data.reports.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">✅</div>
            <p className="text-gray-500">No hay reportes con este filtro</p>
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
              Pagina {page} de {data.pagination.pages}
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
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Resolver reporte</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas de resolucion (opcional)
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Describe las acciones tomadas..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setSelectedReport(null); setAdminNotes(''); }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedReport.id, 'resolved')}
                disabled={actionLoading === selectedReport.id}
                className="flex-1 py-3 bg-green-500 text-white font-medium rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {actionLoading === selectedReport.id ? 'Guardando...' : 'Resolver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
