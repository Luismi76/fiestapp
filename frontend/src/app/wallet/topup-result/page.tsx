'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { walletApi } from '@/lib/api';
import { vatAmount, withVat } from '@/lib/constants';
import MainLayout from '@/components/MainLayout';

function TopUpResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [result, setResult] = useState<{ success: boolean; amount?: number } | null>(null);

  const status = searchParams.get('status');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (!sessionId) {
      setChecking(false);
      return;
    }

    if (status === 'error') {
      setResult({ success: false });
      setChecking(false);
      return;
    }

    setChecking(true);
    setResult(null);

    let cancelled = false;
    const delays = [0, 2000, 3000, 4000, 5000, 6000];

    const poll = async () => {
      for (let i = 0; i < delays.length; i++) {
        if (cancelled) return;
        if (delays[i] > 0) await new Promise((r) => setTimeout(r, delays[i]));
        if (cancelled) return;

        try {
          const data = await walletApi.checkTopUpResult(sessionId);
          if (data.success) {
            setResult(data);
            setChecking(false);
            return;
          }
        } catch {
          // Seguir intentando
        }
      }
      // Agotados los reintentos
      setResult({ success: false });
      setChecking(false);
    };

    poll();
    return () => { cancelled = true; };
  }, [user, authLoading, sessionId, status, router]);

  const isSuccess = result?.success === true;
  const isError = !checking && !isSuccess;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
        {!isError && !isSuccess ? (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Verificando pago...</h1>
            <p className="text-gray-500">Comprobando el estado de tu recarga</p>
          </>
        ) : isSuccess ? (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Recarga completada</h1>
            <p className="text-gray-500 mb-1">
              Se han añadido <span className="font-semibold text-green-600">{result?.amount?.toFixed(2)}€</span> a tu monedero.
            </p>
            {result?.amount && (
              <div className="text-xs text-gray-400 mb-1 space-y-0.5">
                <p>Recarga: {result.amount.toFixed(2)}€ · IVA: {vatAmount(result.amount).toFixed(2)}€ · Total cobrado: {withVat(result.amount).toFixed(2)}€</p>
              </div>
            )}
            <p className="text-sm text-gray-400 mb-6">
              {result?.amount ? Math.floor(result.amount / 1.5) : 0} operaciones disponibles
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/wallet')}
                className="flex-1 py-3 btn-primary rounded-xl font-semibold"
              >
                Ver monedero
              </button>
              <button
                onClick={() => router.push('/experiences')}
                className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
              >
                Explorar
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {status === 'error' ? 'Pago no completado' : 'Error de verificación'}
            </h1>
            <p className="text-gray-500 mb-6">
              {status === 'error'
                ? 'El pago no se ha procesado. No se ha realizado ningún cargo.'
                : 'No se ha podido verificar el estado del pago. Si el cargo se ha realizado, el saldo se actualizará automáticamente.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/wallet')}
                className="flex-1 py-3 btn-primary rounded-xl font-semibold"
              >
                Volver al monedero
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function TopUpResultPage() {
  return (
    <MainLayout>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        }
      >
        <TopUpResultContent />
      </Suspense>
    </MainLayout>
  );
}
