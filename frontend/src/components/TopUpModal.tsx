'use client';

import { useState } from 'react';
import { walletApi } from '@/lib/api';
import logger from '@/lib/logger';
import { getErrorMessage } from '@/lib/error';

interface TopUpModalProps {
  amount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TopUpModal({ amount, onClose }: TopUpModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const { sessionUrl } = await walletApi.createTopUp(amount);
      // Redirigir a Stripe Checkout
      window.location.href = sessionUrl;
    } catch (err) {
      logger.error('TopUp error:', err);
      setError(getErrorMessage(err, 'Error al iniciar el pago'));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl p-6 max-w-md w-full"
        role="dialog"
        aria-modal="true"
        aria-labelledby="topup-modal-title"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="topup-modal-title" className="text-xl font-bold text-gray-900">
            Recargar monedero
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
            aria-label="Cerrar"
            disabled={loading}
          >
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="text-center mb-6">
          <p className="text-3xl font-bold text-gray-900">{amount.toFixed(2)}€</p>
          <p className="text-gray-500 text-sm">{Math.floor(amount / 1.5)} operaciones</p>
          <div className="mt-2 text-xs text-gray-400 space-y-0.5">
            <p>Recarga: {amount.toFixed(2)}€</p>
            <p>IVA (21%): {(Math.round(amount * 0.21 * 100) / 100).toFixed(2)}€</p>
            <p className="font-medium text-gray-600">Total a pagar: {(Math.round((amount * 1.21) * 100) / 100).toFixed(2)}€</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-blue-700">
              Seras redirigido a la pasarela de pago segura para completar la recarga con tarjeta.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handlePayment}
            disabled={loading}
            className="flex-1 btn-primary py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Redirigiendo...
              </span>
            ) : (
              'Pagar'
            )}
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-3">
          Pago seguro procesado por Stripe
        </p>
      </div>
    </div>
  );
}
