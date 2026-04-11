'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { connectApi, ConnectStatus } from '@/lib/api';
import MainLayout from '@/components/MainLayout';

export default function ConnectPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const data = await connectApi.getStatus();
      setStatus(data);
    } catch {
      setError('Error al cargar el estado de tu cuenta de cobros');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      loadStatus();
    }
  }, [user, authLoading, router, loadStatus]);

  const handleStartOnboarding = async () => {
    setActionLoading(true);
    setError(null);
    try {
      // Crear cuenta si no existe
      if (!status?.hasAccount) {
        await connectApi.createAccount();
      }
      // Generar link de onboarding
      const { url } = await connectApi.createLink();
      window.location.href = url;
    } catch {
      setError('Error al iniciar el proceso. Intentalo de nuevo.');
      setActionLoading(false);
    }
  };

  const handleOpenDashboard = async () => {
    setActionLoading(true);
    try {
      const { url } = await connectApi.getDashboardLink();
      window.open(url, '_blank');
    } catch {
      setError('Error al abrir el panel. Intentalo de nuevo.');
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Cuenta de cobros</h1>
        <p className="text-gray-500 mb-8">
          Configura tu cuenta para recibir pagos directamente en tu banco cuando los viajeros paguen por tus experiencias.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Estado actual */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="p-6">
            {/* Sin cuenta */}
            {!status?.hasAccount && (
              <>
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Empieza a recibir pagos</h2>
                <p className="text-gray-500 text-sm mb-6">
                  Conecta tu cuenta bancaria a traves de Stripe para recibir los pagos de tus experiencias directamente. El proceso es rapido y seguro.
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5 shrink-0">
                      <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-700">Verificacion de identidad rapida</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5 shrink-0">
                      <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-700">Cobros directos a tu cuenta bancaria</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5 shrink-0">
                      <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-700">Panel para ver tus ingresos y pagos</span>
                  </li>
                </ul>
                <button
                  onClick={handleStartOnboarding}
                  disabled={actionLoading}
                  className="w-full btn-primary py-3 rounded-xl font-semibold disabled:opacity-50"
                >
                  {actionLoading ? 'Preparando...' : 'Configurar cuenta de cobros'}
                </button>
              </>
            )}

            {/* Cuenta creada pero no onboarded */}
            {status?.hasAccount && !status.onboarded && (
              <>
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Completa tu verificacion</h2>
                <p className="text-gray-500 text-sm mb-6">
                  Tu cuenta esta creada pero necesitas completar la verificacion de identidad para poder recibir pagos.
                </p>
                <button
                  onClick={handleStartOnboarding}
                  disabled={actionLoading}
                  className="w-full btn-primary py-3 rounded-xl font-semibold disabled:opacity-50"
                >
                  {actionLoading ? 'Preparando...' : 'Completar verificacion'}
                </button>
              </>
            )}

            {/* Cuenta activa */}
            {status?.hasAccount && status.onboarded && status.payoutsEnabled && (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Cuenta activa</h2>
                <p className="text-gray-500 text-sm mb-6">
                  Tu cuenta de cobros esta verificada y activa. Los pagos de tus experiencias se transferiran directamente a tu cuenta bancaria.
                </p>
                <button
                  onClick={handleOpenDashboard}
                  disabled={actionLoading}
                  className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Abriendo...' : 'Ver panel de cobros'}
                </button>
              </>
            )}

            {/* Onboarded pero payouts no habilitados */}
            {status?.hasAccount && status.onboarded && !status.payoutsEnabled && (
              <>
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">En revision</h2>
                <p className="text-gray-500 text-sm mb-6">
                  Tu cuenta esta siendo revisada por Stripe. Recibiras una notificacion cuando los pagos esten habilitados.
                </p>
                <button
                  onClick={() => loadStatus()}
                  className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Comprobar estado
                </button>
              </>
            )}
          </div>
        </div>

        {/* Info de seguridad */}
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-700">Pagos seguros con Stripe</p>
              <p className="text-xs text-gray-500 mt-1">
                Stripe gestiona la verificacion de identidad y los pagos. FiestApp nunca tiene acceso a tus datos bancarios.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
