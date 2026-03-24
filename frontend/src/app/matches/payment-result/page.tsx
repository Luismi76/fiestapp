'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { matchesApi } from '@/lib/api';
import MainLayout from '@/components/MainLayout';

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [success, setSuccess] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);

  const status = searchParams.get('status');
  const matchId = searchParams.get('matchId');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (!user || !matchId) {
      setChecking(false);
      return;
    }

    if (status === 'error') {
      setSuccess(false);
      setChecking(false);
      return;
    }

    // Polling: esperar a que el webhook de Stripe se procese
    let cancelled = false;
    const delays = [1000, 2000, 3000, 4000, 5000];

    const poll = async () => {
      for (let i = 0; i < delays.length; i++) {
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, delays[i]));
        if (cancelled) return;

        try {
          const data = await matchesApi.getPaymentStatus(matchId);
          if (data.paymentStatus === 'paid' || data.paymentStatus === 'held') {
            setSuccess(true);
            setAmount(data.amount);
            setChecking(false);
            return;
          }
        } catch {
          // Seguir intentando
        }
      }
      setSuccess(false);
      setChecking(false);
    };

    poll();
    return () => { cancelled = true; };
  }, [user, authLoading, matchId, status, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
        {checking ? (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Verificando pago...</h1>
            <p className="text-gray-500">Comprobando el estado de tu pago</p>
          </>
        ) : success ? (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Pago completado</h1>
            <p className="text-gray-500 mb-6">
              Tu pago de <span className="font-semibold text-green-600">{amount?.toFixed(2)}€</span> se ha procesado correctamente. La reserva está confirmada.
            </p>
            <button
              onClick={() => router.push(`/messages/${matchId}`)}
              className="w-full py-3 btn-primary rounded-xl font-semibold"
            >
              Ir al chat
            </button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Pago no completado</h1>
            <p className="text-gray-500 mb-6">
              El pago no se ha procesado. No se ha realizado ningún cargo. Puedes volver al chat e intentarlo de nuevo.
            </p>
            <button
              onClick={() => router.push(`/messages/${matchId}`)}
              className="w-full py-3 btn-primary rounded-xl font-semibold"
            >
              Volver al chat
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <MainLayout>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        }
      >
        <PaymentResultContent />
      </Suspense>
    </MainLayout>
  );
}
