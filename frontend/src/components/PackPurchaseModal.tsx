'use client';

import { useState, useEffect } from 'react';
import { walletApi } from '@/lib/api';
import logger from '@/lib/logger';
import { getErrorMessage } from '@/lib/error';

interface Pack {
  id: string;
  name: string;
  price: number;
  experiences: number;
  bonus: number;
}

interface PackPurchaseModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PackPurchaseModal({ onClose }: PackPurchaseModalProps) {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPacks, setLoadingPacks] = useState(true);
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    walletApi.getPacks()
      .then(({ data }) => {
        setPacks(data);
        if (data.length > 0) setSelectedPack(data[0].id);
      })
      .catch(() => setError('No se pudieron cargar los packs'))
      .finally(() => setLoadingPacks(false));
  }, []);

  const handlePurchase = async () => {
    if (!selectedPack) return;
    setLoading(true);
    setError(null);

    try {
      const { sessionUrl } = await walletApi.purchasePack(selectedPack);
      window.location.href = sessionUrl;
    } catch (err) {
      logger.error('Pack purchase error:', err);
      setError(getErrorMessage(err, 'Error al iniciar el pago'));
      setLoading(false);
    }
  };

  const packColors: Record<string, { bg: string; border: string; badge: string }> = {
    basico: { bg: 'bg-gray-50', border: 'ring-gray-300', badge: '' },
    aventura: { bg: 'bg-blue-50', border: 'ring-blue-400', badge: 'bg-blue-100 text-blue-700' },
    viajero: { bg: 'bg-primary/5', border: 'ring-primary', badge: 'bg-primary/10 text-primary' },
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pack-modal-title"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 id="pack-modal-title" className="text-xl font-bold text-gray-900">
            Comprar experiencias
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
            aria-label="Cerrar"
            disabled={loading}
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loadingPacks ? (
          <div className="flex justify-center py-8">
            <div className="spinner" />
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-5">
              {packs.map((pack) => {
                const isSelected = selectedPack === pack.id;
                const colors = packColors[pack.id] || packColors.basico;
                const pricePerExp = Math.round((pack.price / pack.experiences) * 100) / 100;

                return (
                  <button
                    key={pack.id}
                    onClick={() => setSelectedPack(pack.id)}
                    disabled={loading}
                    className={`w-full text-left p-4 rounded-xl transition-all ${colors.bg} ${
                      isSelected ? `ring-2 ${colors.border}` : 'ring-1 ring-gray-200 hover:ring-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900">{pack.name}</h3>
                          {pack.bonus > 0 && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
                              +{pack.bonus} gratis
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {pack.experiences} experiencias · {pricePerExp.toFixed(2)}€/exp
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">{pack.price.toFixed(2)}€</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-blue-700">
                  Los créditos no caducan. Se usa 1 por experiencia al cerrar acuerdo, tanto para viajeros como anfitriones.
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm mb-4">
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
                onClick={handlePurchase}
                disabled={loading || !selectedPack}
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
                  'Comprar'
                )}
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center mt-3">
              Pago seguro procesado por Stripe
            </p>
          </>
        )}
      </div>
    </div>
  );
}
