'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

interface DeletionStatus {
  hasPendingDeletion: boolean;
  scheduledFor?: string;
}

export default function DataManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState<DeletionStatus | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchDeletionStatus();
    }
  }, [user]);

  const fetchDeletionStatus = async () => {
    try {
      const response = await api.get<DeletionStatus>('/gdpr/deletion-status');
      setDeletionStatus(response.data);
    } catch {
      // Silently fail
    }
  };

  const handleExportData = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await api.get('/gdpr/export', {
        responseType: 'blob',
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fiestapp-datos-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Datos exportados correctamente' });
    } catch {
      setMessage({ type: 'error', text: 'Error al exportar los datos' });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestDeletion = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await api.post('/gdpr/delete-request', { reason: deleteReason });
      setMessage({
        type: 'success',
        text: 'Solicitud de eliminación registrada. Tu cuenta será eliminada en 30 días.'
      });
      setShowDeleteConfirm(false);
      setDeleteReason('');
      fetchDeletionStatus();
    } catch {
      setMessage({ type: 'error', text: 'Error al solicitar la eliminación' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDeletion = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await api.delete('/gdpr/delete-request');
      setMessage({ type: 'success', text: 'Solicitud de eliminación cancelada' });
      fetchDeletionStatus();
    } catch {
      setMessage({ type: 'error', text: 'Error al cancelar la solicitud' });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 pt-6 pb-20">
        <div className="px-4">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Volver al perfil
          </Link>
          <h1 className="text-2xl font-bold text-white">Mis datos personales</h1>
          <p className="text-white/70 mt-1">Gestiona y controla tu información</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-12">
        {/* Message */}
        {message && (
          <div className={`mb-4 p-4 rounded-xl ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* GDPR Info Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Tus derechos GDPR</h2>
              <p className="text-sm text-gray-500 mt-1">
                Conforme al Reglamento General de Protección de Datos, tienes derecho a acceder,
                rectificar, exportar y eliminar tus datos personales.
              </p>
            </div>
          </div>
        </div>

        {/* Export Data */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-green-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Exportar mis datos</h3>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                Descarga una copia de todos tus datos en formato JSON. Incluye tu perfil,
                experiencias, reservas, reseñas y más.
              </p>
              <button
                onClick={handleExportData}
                disabled={loading}
                className="w-full py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="spinner spinner-sm border-white/30 border-t-white" />
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Descargar mis datos
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Delete Account */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-red-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Eliminar mi cuenta</h3>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                Solicita la eliminación permanente de tu cuenta y todos tus datos.
                Tendrás 30 días para cancelar esta solicitud.
              </p>

              {deletionStatus?.hasPendingDeletion ? (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-sm text-amber-800">
                      <strong>Eliminación programada:</strong>{' '}
                      {deletionStatus.scheduledFor
                        ? new Date(deletionStatus.scheduledFor).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : 'Próximamente'}
                    </p>
                  </div>
                  <button
                    onClick={handleCancelDeletion}
                    disabled={loading}
                    className="w-full py-3 bg-gray-600 text-white font-medium rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  >
                    Cancelar eliminación
                  </button>
                </div>
              ) : showDeleteConfirm ? (
                <div className="space-y-3">
                  <textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="¿Por qué quieres eliminar tu cuenta? (opcional)"
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleRequestDeletion}
                      disabled={loading}
                      className="flex-1 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {loading ? 'Procesando...' : 'Confirmar eliminación'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-3 bg-red-50 text-red-600 font-medium rounded-xl border border-red-200 hover:bg-red-100 transition-colors"
                >
                  Solicitar eliminación de cuenta
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Privacy Links */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Documentos legales</h3>
          <div className="space-y-2">
            <Link
              href="/privacy"
              className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <span className="text-gray-700">Política de privacidad</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
            <Link
              href="/terms"
              className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <span className="text-gray-700">Términos de servicio</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
