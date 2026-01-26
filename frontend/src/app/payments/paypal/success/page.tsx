'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';

function PayPalSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const authorizePayment = async () => {
      // Get the token from URL (PayPal adds it after approval)
      const token = searchParams.get('token');
      const matchId = searchParams.get('matchId');

      if (!token) {
        setStatus('error');
        setError('No se encontro el token de pago');
        return;
      }

      try {
        // Authorize the PayPal order
        await api.post('/payments/paypal/authorize', {
          orderId: token,
        });

        setStatus('success');

        // Clear pending match from session storage
        sessionStorage.removeItem('paypal_pending_match');

        // Redirect to matches after a short delay
        setTimeout(() => {
          if (matchId) {
            router.push(`/matches/${matchId}`);
          } else {
            router.push('/matches');
          }
        }, 3000);
      } catch (err) {
        setStatus('error');
        setError(getErrorMessage(err, 'Error al procesar el pago'));
      }
    };

    authorizePayment();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Procesando pago</h1>
            <p className="text-gray-500">Estamos confirmando tu pago con PayPal...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-emerald-600">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Pago completado</h1>
            <p className="text-gray-500 mb-6">Tu pago con PayPal se ha procesado correctamente.</p>
            <p className="text-sm text-gray-400">Redirigiendo...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-red-600">
                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Error en el pago</h1>
            <p className="text-gray-500 mb-6">{error}</p>
            <Link
              href="/matches"
              className="inline-block px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition-colors"
            >
              Volver a mis matches
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function PayPalSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Cargando...</h1>
        </div>
      </div>
    }>
      <PayPalSuccessContent />
    </Suspense>
  );
}
