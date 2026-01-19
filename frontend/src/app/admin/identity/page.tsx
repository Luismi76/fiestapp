'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { identityApi, PendingVerification } from '@/lib/api';
import { getUploadUrl } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminIdentityPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [verifications, setVerifications] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [selectedVerification, setSelectedVerification] = useState<PendingVerification | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/');
      return;
    }

    if (user?.role === 'admin') {
      loadData();
    }
  }, [user, authLoading, router, page]);

  const loadData = async () => {
    try {
      const [verificationsData, statsData] = await Promise.all([
        identityApi.getPending(page, 10),
        identityApi.getStats(),
      ]);
      setVerifications(verificationsData.verifications);
      setTotalPages(verificationsData.pagination.pages);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    if (!confirm('¿Aprobar esta verificación de identidad?')) return;

    setProcessing(true);
    try {
      await identityApi.approve(userId);
      await loadData();
      setSelectedVerification(null);
    } catch (err) {
      console.error('Error approving:', err);
      alert('Error al aprobar la verificación');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (userId: string) => {
    if (!rejectReason.trim()) {
      alert('Debes indicar un motivo de rechazo');
      return;
    }

    setProcessing(true);
    try {
      await identityApi.reject(userId, rejectReason);
      await loadData();
      setSelectedVerification(null);
      setRejectReason('');
    } catch (err) {
      console.error('Error rejecting:', err);
      alert('Error al rechazar la verificación');
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Verificación de Identidad</h1>
            <p className="text-gray-600">Gestiona las solicitudes de verificación</p>
          </div>
          <Link href="/admin" className="text-primary hover:underline">
            ← Volver al panel
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
            <p className="text-yellow-800 text-sm font-medium">Pendientes</p>
            <p className="text-3xl font-bold text-yellow-900">{stats.pending}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <p className="text-green-800 text-sm font-medium">Aprobadas</p>
            <p className="text-3xl font-bold text-green-900">{stats.approved}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <p className="text-red-800 text-sm font-medium">Rechazadas</p>
            <p className="text-3xl font-bold text-red-900">{stats.rejected}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-gray-800 text-sm font-medium">Total</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>

        {/* Verifications List */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Solicitudes Pendientes ({stats.pending})
            </h2>
          </div>

          {verifications.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="text-gray-500">No hay verificaciones pendientes</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {verifications.map((verification) => (
                <div
                  key={verification.id}
                  className="p-6 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedVerification(verification)}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                      {verification.avatar ? (
                        <img
                          src={getUploadUrl(verification.avatar)}
                          alt={verification.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xl font-bold">
                          {verification.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{verification.name}</p>
                      <p className="text-sm text-gray-500 truncate">{verification.email}</p>
                    </div>

                    {/* Date */}
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {verification.identitySubmittedAt && new Date(verification.identitySubmittedAt).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                      <p className="text-xs text-gray-400">
                        {verification.identitySubmittedAt && new Date(verification.identitySubmittedAt).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>

                    {/* Arrow */}
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-600">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Detail Modal */}
      {selectedVerification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                  {selectedVerification.avatar ? (
                    <img
                      src={getUploadUrl(selectedVerification.avatar)}
                      alt={selectedVerification.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                      {selectedVerification.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedVerification.name}</h3>
                  <p className="text-sm text-gray-500">{selectedVerification.email}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedVerification(null);
                  setRejectReason('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Images */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Document */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Documento de Identidad</h4>
                  {selectedVerification.identityDocument ? (
                    <a
                      href={getUploadUrl(selectedVerification.identityDocument)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={getUploadUrl(selectedVerification.identityDocument)}
                        alt="Documento"
                        className="w-full h-64 object-contain bg-gray-100 rounded-lg border hover:opacity-90 transition-opacity"
                      />
                      <p className="text-sm text-primary mt-1 text-center">
                        Clic para ver en tamaño completo
                      </p>
                    </a>
                  ) : (
                    <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                      <p className="text-gray-500">No disponible</p>
                    </div>
                  )}
                </div>

                {/* Selfie */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Selfie con Documento</h4>
                  {selectedVerification.identitySelfie ? (
                    <a
                      href={getUploadUrl(selectedVerification.identitySelfie)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={getUploadUrl(selectedVerification.identitySelfie)}
                        alt="Selfie"
                        className="w-full h-64 object-contain bg-gray-100 rounded-lg border hover:opacity-90 transition-opacity"
                      />
                      <p className="text-sm text-primary mt-1 text-center">
                        Clic para ver en tamaño completo
                      </p>
                    </a>
                  ) : (
                    <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                      <p className="text-gray-500">No disponible</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Reject reason */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo de rechazo (solo si rechazas)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ej: El documento no es legible, la foto no coincide, etc."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  onClick={() => handleApprove(selectedVerification.id)}
                  disabled={processing}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  Aprobar
                </button>
                <button
                  onClick={() => handleReject(selectedVerification.id)}
                  disabled={processing}
                  className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  Rechazar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
