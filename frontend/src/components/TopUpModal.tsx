'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { walletApi } from '@/lib/api';
import logger from '@/lib/logger';
import { getErrorMessage } from '@/lib/error';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

interface TopUpModalProps {
  amount: number;
  onClose: () => void;
  onSuccess: () => void;
}

function TopUpForm({ amount, onClose, onSuccess, paymentIntentId }: TopUpModalProps & { paymentIntentId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Primero validar el formulario y recoger los datos de pago
      const { error: submitError } = await elements.submit();
      if (submitError) {
        logger.debug('Elements submit error:', submitError);
        setError(submitError.message || 'Error de validación del formulario');
        setLoading(false);
        return;
      }

      logger.debug('Elements validated successfully, confirming payment...');

      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      logger.debug('Stripe response:', { stripeError, paymentIntent });

      if (stripeError) {
        setError(stripeError.message || 'Error al procesar el pago');
        return;
      }

      if (!paymentIntent) {
        setError('No se recibió respuesta del pago');
        return;
      }

      logger.debug('Payment intent status:', paymentIntent.status);

      if (paymentIntent.status === 'succeeded') {
        // Confirmar la recarga en el backend
        logger.debug('Confirming topup - prop paymentIntentId:', paymentIntentId);
        logger.debug('Confirming topup - Stripe paymentIntent.id:', paymentIntent.id);
        // Usar el ID de Stripe directamente para asegurar consistencia
        await walletApi.confirmTopUp(paymentIntent.id);
        onSuccess();
      } else if (paymentIntent.status === 'processing') {
        // El pago está procesándose, confirmar en backend
        await walletApi.confirmTopUp(paymentIntent.id);
        onSuccess();
      } else if (paymentIntent.status === 'requires_action') {
        setError('Se requiere autenticación adicional. Por favor, completa la verificación.');
      } else {
        setError(`Estado del pago: ${paymentIntent.status}. Intenta de nuevo.`);
      }
    } catch (err) {
      logger.error('TopUp error:', err);
      setError(getErrorMessage(err, 'Error al completar la recarga'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-4">
        <p className="text-3xl font-bold text-gray-900">{amount.toFixed(2)}€</p>
        <p className="text-gray-500 text-sm">{Math.floor(amount / 1.5)} operaciones</p>
      </div>

      <PaymentElement />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 btn-primary py-3 rounded-xl font-semibold disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Procesando...
            </span>
          ) : (
            'Pagar'
          )}
        </button>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Pago seguro procesado por Stripe
      </p>
    </form>
  );
}

export default function TopUpModal({ amount, onClose, onSuccess }: TopUpModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initPayment = async () => {
      try {
        const { clientSecret, paymentIntentId } = await walletApi.createTopUp(amount);
        setClientSecret(clientSecret);
        setPaymentIntentId(paymentIntentId);
      } catch (err) {
        setError('No se pudo iniciar el pago. Los pagos no están configurados.');
        logger.error('Error creating top-up intent:', err);
      } finally {
        setLoading(false);
      }
    };

    initPayment();
  }, [amount]);

  if (!stripePromise) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full">
          <div className="text-center">
            <svg className="w-16 h-16 text-amber-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Pagos no disponibles
            </h3>
            <p className="text-gray-500 mb-4">
              El sistema de pagos no está configurado actualmente.
            </p>
            <button
              onClick={onClose}
              className="btn-primary py-2 px-6 rounded-xl"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Recargar monedero</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="btn-secondary py-2 px-6 rounded-xl"
            >
              Cerrar
            </button>
          </div>
        ) : clientSecret && paymentIntentId ? (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#FF6B35',
                  borderRadius: '8px',
                },
              },
            }}
          >
            <TopUpForm
              amount={amount}
              onClose={onClose}
              onSuccess={onSuccess}
              paymentIntentId={paymentIntentId}
            />
          </Elements>
        ) : null}
      </div>
    </div>
  );
}
