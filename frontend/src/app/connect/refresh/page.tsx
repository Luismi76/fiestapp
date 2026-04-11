'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { connectApi } from '@/lib/api';
import MainLayout from '@/components/MainLayout';

export default function ConnectRefreshPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRetry = async () => {
    setLoading(true);
    try {
      const { url } = await connectApi.createLink();
      window.location.href = url;
    } catch {
      router.push('/connect');
    }
  };

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Enlace expirado</h1>
        <p className="text-gray-500 mb-8">
          El enlace de verificacion ha expirado. No te preocupes, puedes generar uno nuevo para continuar con el proceso.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleRetry}
            disabled={loading}
            className="btn-primary py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            {loading ? 'Generando enlace...' : 'Reintentar verificacion'}
          </button>
          <button
            onClick={() => router.push('/connect')}
            className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
          >
            Volver a cuenta de cobros
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
