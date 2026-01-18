'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { walletApi, WalletInfo, WalletTransaction } from '@/lib/api';
import TopUpModal from '@/components/TopUpModal';
import BottomNav from '@/components/BottomNav';

export default function WalletPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number>(4.5);

  // Opciones de recarga predefinidas
  const topUpOptions = [
    { amount: 4.5, operations: 3, label: '3 ops' },
    { amount: 9, operations: 6, label: '6 ops' },
    { amount: 15, operations: 10, label: '10 ops' },
    { amount: 30, operations: 20, label: '20 ops', popular: true },
  ];

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadWalletData();
    }
  }, [user]);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const [walletData, transactionsData] = await Promise.all([
        walletApi.getWallet(),
        walletApi.getTransactions(),
      ]);
      setWallet(walletData);
      setTransactions(transactionsData.transactions);
    } catch (error) {
      console.error('Error loading wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTopUpSuccess = () => {
    setShowTopUpModal(false);
    loadWalletData();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: string, amount: number) => {
    if (type === 'topup') {
      return (
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      </div>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="font-semibold text-gray-900">Mi Monedero</span>
          <div className="w-10" />
        </div>
      </div>

      {/* Balance Card */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="text-center mb-6">
            <p className="text-gray-500 text-sm mb-1">Saldo disponible</p>
            <p className="text-4xl font-bold text-gray-900">
              {wallet?.balance.toFixed(2)}€
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {wallet?.operationsAvailable || 0} operaciones disponibles
            </p>
          </div>

          {/* Status indicator */}
          {wallet && !wallet.canOperate && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-amber-700 text-sm">
                  Saldo insuficiente. Recarga para poder operar.
                </span>
              </div>
            </div>
          )}

          {/* Opciones de recarga */}
          <div className="space-y-3">
            <p className="text-sm text-gray-600 font-medium">Selecciona cantidad a recargar:</p>
            <div className="grid grid-cols-2 gap-3">
              {topUpOptions.map((option) => (
                <button
                  key={option.amount}
                  onClick={() => {
                    setSelectedAmount(option.amount);
                    setShowTopUpModal(true);
                  }}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    option.popular
                      ? 'border-primary bg-orange-50 hover:bg-orange-100'
                      : 'border-gray-200 hover:border-primary hover:bg-gray-50'
                  }`}
                >
                  {option.popular && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                      Popular
                    </span>
                  )}
                  <div className="text-2xl font-bold text-gray-900">{option.amount}€</div>
                  <div className="text-sm text-gray-500">{option.operations} operaciones</div>
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Coste por operación</span>
              <span className="font-medium">{wallet?.platformFee}€</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Historial</h2>

        {transactions.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-gray-500">Sin movimientos aún</p>
            <p className="text-gray-400 text-sm mt-1">
              Tus recargas y operaciones aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl divide-y divide-gray-100">
            {transactions.map((tx) => (
              <div key={tx.id} className="p-4 flex items-center gap-3">
                {getTransactionIcon(tx.type, tx.amount)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {tx.type === 'topup' ? 'Recarga' :
                     tx.type === 'platform_fee' ? 'Tarifa de plataforma' :
                     tx.description || 'Transacción'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDate(tx.updatedAt || tx.createdAt)}
                  </p>
                </div>
                <span className={`font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}€
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="px-4 mt-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">¿Cómo funciona?</h2>
        <div className="bg-white rounded-xl p-4 space-y-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold text-sm">1</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Recarga tu monedero</p>
              <p className="text-sm text-gray-500">Mínimo 4,50€ (3 operaciones)</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold text-sm">2</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Conecta con experiencias</p>
              <p className="text-sm text-gray-500">Solicita o recibe solicitudes</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold text-sm">3</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Al completar, se descuenta</p>
              <p className="text-sm text-gray-500">1,50€ por cada usuario al cerrar</p>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />

      {/* TopUp Modal */}
      {showTopUpModal && (
        <TopUpModal
          amount={selectedAmount}
          onClose={() => setShowTopUpModal(false)}
          onSuccess={handleTopUpSuccess}
        />
      )}
    </div>
  );
}
