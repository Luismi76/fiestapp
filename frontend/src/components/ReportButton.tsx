'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { reportsApi, CreateReportData } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface ReportButtonProps {
  type: 'user' | 'experience' | 'match';
  id: string;
  className?: string;
}

const REASONS = [
  { value: 'spam', label: 'Spam o publicidad' },
  { value: 'inappropriate', label: 'Contenido inapropiado' },
  { value: 'fraud', label: 'Fraude o estafa' },
  { value: 'harassment', label: 'Acoso o amenazas' },
  { value: 'other', label: 'Otro motivo' },
] as const;

export default function ReportButton({ type, id, className = '' }: ReportButtonProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<CreateReportData['reason'] | ''>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleOpen = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      setError('Selecciona un motivo');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await reportsApi.create({
        reportedType: type,
        reportedId: id,
        reason,
        description: description.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setReason('');
        setDescription('');
      }, 2000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Error al enviar el reporte');
    } finally {
      setSubmitting(false);
    }
  };

  const typeLabel = type === 'user' ? 'usuario' : type === 'experience' ? 'experiencia' : 'reserva';

  return (
    <>
      <button
        onClick={handleOpen}
        className={`flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors ${className}`}
        title={`Reportar ${typeLabel}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
        </svg>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Reportar {typeLabel}</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {success ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-green-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Reporte enviado</h3>
                <p className="text-gray-500 text-sm">Gracias por ayudarnos a mantener la comunidad segura.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                {/* Reason selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo del reporte
                  </label>
                  <div className="space-y-2">
                    {REASONS.map((r) => (
                      <label key={r.value} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                        <input
                          type="radio"
                          name="reason"
                          value={r.value}
                          checked={reason === r.value}
                          onChange={(e) => setReason(e.target.value as CreateReportData['reason'])}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-gray-700">{r.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripcion (opcional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Proporciona mas detalles sobre el problema..."
                    rows={3}
                    maxLength={1000}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !reason}
                  className="w-full py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Enviando...' : 'Enviar reporte'}
                </button>

                <p className="text-xs text-gray-400 text-center">
                  Los reportes falsos pueden resultar en suspension de cuenta.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
