'use client';

import { useState } from 'react';
import { disputesApi, DisputeReason } from '@/lib/api';
import { getErrorMessage } from '@/lib/error';

interface DisputeModalProps {
  matchId: string;
  experienceTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

const REASONS: { value: DisputeReason; label: string; description: string }[] = [
  { value: 'NO_SHOW', label: 'No se presento', description: 'El anfitrion o viajero no acudio a la cita' },
  { value: 'EXPERIENCE_MISMATCH', label: 'No coincide', description: 'La experiencia no fue como se describio' },
  { value: 'SAFETY_CONCERN', label: 'Seguridad', description: 'Hubo un problema de seguridad durante la experiencia' },
  { value: 'PAYMENT_ISSUE', label: 'Problema de pago', description: 'Hay un problema con el cobro o reembolso' },
  { value: 'COMMUNICATION', label: 'Comunicacion', description: 'Problemas de comunicacion con el otro usuario' },
  { value: 'OTHER', label: 'Otro', description: 'Otro motivo no listado' },
];

export default function DisputeModal({ matchId, experienceTitle, onClose, onSuccess }: DisputeModalProps) {
  const [reason, setReason] = useState<DisputeReason | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !description.trim()) return;

    setLoading(true);
    setError('');
    try {
      await disputesApi.create({ matchId, reason, description: description.trim() });
      onSuccess();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo abrir la disputa'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-y-auto animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Abrir disputa</h2>
            <p className="text-xs text-gray-500 mt-0.5">{experienceTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-500">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Reason selection */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Motivo de la disputa</label>
            <div className="space-y-2">
              {REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setReason(r.value)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                    reason === r.value
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="font-medium text-sm text-gray-900">{r.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{r.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Describe el problema
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explica con detalle lo que ocurrio..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm resize-none"
              maxLength={1000}
            />
            <div className="text-xs text-gray-400 text-right mt-1">{description.length}/1000</div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!reason || !description.trim() || loading}
              className="flex-1 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enviando...' : 'Abrir disputa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
