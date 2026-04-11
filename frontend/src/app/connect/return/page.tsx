'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { connectApi, ConnectStatus } from '@/lib/api';
import MainLayout from '@/components/MainLayout';

export default function ConnectReturnPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      const checkStatus = async () => {
        try {
          const data = await connectApi.getStatus();
          setStatus(data);
        } catch {
          // Redirigir al estado principal
        } finally {
          setLoading(false);
        }
      };
      checkStatus();
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  const isComplete = status?.onboarded && status?.payoutsEnabled;

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        {isComplete ? (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Cuenta configurada</h1>
            <p className="text-gray-500 mb-8">
              Tu cuenta de cobros esta lista. Los pagos de tus experiencias se transferiran directamente a tu cuenta bancaria.
            </p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Verificacion en proceso</h1>
            <p className="text-gray-500 mb-8">
              Stripe esta revisando tu informacion. Te notificaremos cuando tu cuenta este lista para recibir pagos.
            </p>
          </>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push('/connect')}
            className="btn-primary py-3 rounded-xl font-semibold"
          >
            Ver estado de la cuenta
          </button>
          <button
            onClick={() => router.push('/experiences')}
            className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
          >
            Explorar experiencias
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
