'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import PaymentForm from './PaymentForm';
import PayPalButton from './PayPalButton';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

type PaymentMethod = 'stripe' | 'paypal';

interface PaymentModalProps {
  matchId: string;
  amount: number;
  experienceTitle: string;
  onSuccess: () => void;
  onClose: () => void;
}

export default function PaymentModal({
  matchId,
  amount,
  experienceTitle,
  onSuccess,
  onClose,
}: PaymentModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableMethods, setAvailableMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);

  // Fetch available payment methods
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const response = await api.get('/payments/methods');
        const methods = response.data.methods as PaymentMethod[];
        setAvailableMethods(methods);

        // Auto-select if only one method available
        if (methods.length === 1) {
          setSelectedMethod(methods[0]);
        }
      } catch (err) {
        // Default to both methods if API fails
        setAvailableMethods(['stripe', 'paypal']);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentMethods();
  }, []);

  // Create Stripe payment intent when stripe is selected
  useEffect(() => {
    if (selectedMethod === 'stripe' && !clientSecret) {
      setStripeLoading(true);
      const createPaymentIntent = async () => {
        try {
          const response = await api.post(`/payments/create-intent/${matchId}`);
          setClientSecret(response.data.clientSecret);
        } catch (err) {
          setError(getErrorMessage(err, 'Error al inicializar el pago'));
        } finally {
          setStripeLoading(false);
        }
      };
      createPaymentIntent();
    }
  }, [selectedMethod, matchId, clientSecret]);

  const handleSuccess = () => {
    onSuccess();
    onClose();
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:w-[450px] sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold">Confirmar pago</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Summary */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-sm text-gray-500 mb-1">Experiencia</p>
            <p className="font-medium text-gray-900">{experienceTitle}</p>
            <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
              <span className="text-gray-600">Total a pagar</span>
              <span className="text-2xl font-bold text-gray-900">{amount}€</span>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-500">Cargando opciones de pago...</p>
            </div>
          ) : error && !selectedMethod ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-red-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
              </div>
              <p className="text-red-600 font-medium mb-2">Error</p>
              <p className="text-gray-500 text-sm mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-full font-medium hover:bg-gray-200"
              >
                Cerrar
              </button>
            </div>
          ) : !selectedMethod && availableMethods.length > 1 ? (
            // Payment method selector
            <div className="space-y-3">
              <p className="text-sm text-gray-600 font-medium mb-3">Elige un metodo de pago:</p>

              {availableMethods.includes('stripe') && (
                <button
                  onClick={() => handleMethodSelect('stripe')}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                    </svg>
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold text-gray-900">Tarjeta de credito/debito</p>
                    <p className="text-sm text-gray-500">Visa, Mastercard, American Express</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              )}

              {availableMethods.includes('paypal') && (
                <button
                  onClick={() => handleMethodSelect('paypal')}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-[#0070ba] hover:bg-blue-50 transition-all flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-[#0070ba] rounded-xl flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19.554 9.488c.121.563.106 1.246-.04 2.014-.582 2.978-2.477 4.466-5.669 4.466h-.674a.703.703 0 0 0-.694.593l-.568 3.528a.538.538 0 0 1-.533.456H8.82a.336.336 0 0 1-.332-.392l.189-1.198.045-.283.75-4.752.047-.282a.703.703 0 0 1 .694-.593h.465c2.881 0 5.14-1.168 5.8-4.546.272-1.388.131-2.549-.474-3.356.143.108.277.228.401.361.577.615.919 1.435 1.148 2.484z" fill="#fff"/>
                      <path d="M8.971 6.716c.127-.016.255-.024.384-.024h4.608c1.098 0 2.124.068 3.016.231a6.24 6.24 0 0 1 .947.235c.339.109.646.25.909.424.577.615.919 1.435 1.148 2.484.121.563.106 1.246-.04 2.014-.582 2.978-2.477 4.466-5.669 4.466h-.674a.703.703 0 0 0-.694.593l-.568 3.528a.538.538 0 0 1-.533.456H8.82a.336.336 0 0 1-.332-.392l.189-1.198 .045-.283.75-4.752.047-.282a.703.703 0 0 1 .694-.593h.465c2.881 0 5.14-1.168 5.8-4.546.272-1.388.131-2.549-.474-3.356a3.97 3.97 0 0 0-.401-.361 4.99 4.99 0 0 0-.909-.424 6.24 6.24 0 0 0-.947-.235c-.892-.163-1.918-.231-3.016-.231H8.971z" fill="#fff" opacity=".7"/>
                    </svg>
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold text-gray-900">PayPal</p>
                    <p className="text-sm text-gray-500">Paga con tu cuenta PayPal</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              )}
            </div>
          ) : selectedMethod === 'stripe' ? (
            // Stripe payment form
            <>
              {availableMethods.length > 1 && (
                <button
                  onClick={() => {
                    setSelectedMethod(null);
                    setError(null);
                  }}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                  </svg>
                  Cambiar metodo de pago
                </button>
              )}

              {stripeLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-gray-500">Preparando el pago...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-red-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                  </div>
                  <p className="text-red-600 font-medium mb-2">Error al inicializar el pago</p>
                  <p className="text-gray-500 text-sm mb-4">{error}</p>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-full font-medium hover:bg-gray-200"
                  >
                    Cerrar
                  </button>
                </div>
              ) : clientSecret ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: {
                        colorPrimary: '#3b82f6',
                        borderRadius: '12px',
                      },
                    },
                    locale: 'es',
                  }}
                >
                  <PaymentForm
                    amount={amount}
                    onSuccess={handleSuccess}
                    onError={handleError}
                  />
                </Elements>
              ) : null}
            </>
          ) : selectedMethod === 'paypal' ? (
            // PayPal payment
            <>
              {availableMethods.length > 1 && (
                <button
                  onClick={() => {
                    setSelectedMethod(null);
                    setError(null);
                  }}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                  </svg>
                  Cambiar metodo de pago
                </button>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-600">
                      <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">Pago seguro</p>
                    <p className="text-sm text-blue-700">
                      Tu pago de <span className="font-bold">{amount}€</span> sera retenido hasta que completes la experiencia
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4">
                  {error}
                </div>
              )}

              <PayPalButton
                matchId={matchId}
                amount={amount}
                onSuccess={handleSuccess}
                onError={handleError}
              />

              <p className="text-xs text-gray-500 text-center mt-4">
                Al confirmar, autorizas el cargo. El dinero se retendra y solo se transferira al anfitrion cuando completes la experiencia.
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
