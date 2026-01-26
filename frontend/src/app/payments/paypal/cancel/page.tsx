'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function PayPalCancelContent() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get('matchId');

  useEffect(() => {
    // Clear pending match from session storage
    sessionStorage.removeItem('paypal_pending_match');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-amber-600">
            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clipRule="evenodd" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Pago cancelado</h1>
        <p className="text-gray-500 mb-6">
          Has cancelado el pago con PayPal. No se ha realizado ningun cargo.
        </p>
        <div className="space-y-3">
          {matchId ? (
            <Link
              href={`/matches/${matchId}`}
              className="block px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition-colors"
            >
              Volver al match
            </Link>
          ) : (
            <Link
              href="/matches"
              className="block px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition-colors"
            >
              Volver a mis matches
            </Link>
          )}
          <Link
            href="/dashboard"
            className="block px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-full hover:bg-gray-200 transition-colors"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PayPalCancelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-4 border-gray-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Cargando...</h1>
        </div>
      </div>
    }>
      <PayPalCancelContent />
    </Suspense>
  );
}
