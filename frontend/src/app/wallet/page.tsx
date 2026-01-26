'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { walletApi, WalletInfo, WalletTransaction } from '@/lib/api';
import TopUpModal from '@/components/TopUpModal';
import MainLayout from '@/components/MainLayout';
import logger from '@/lib/logger';

// Tipos de filtro disponibles
type TransactionFilter = 'all' | 'topup' | 'platform_fee';

const FILTER_OPTIONS: { value: TransactionFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'topup', label: 'Recargas' },
  { value: 'platform_fee', label: 'Acuerdos' },
];

export default function WalletPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number>(4.5);
  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | null>(null);

  // Estados para paginacion y filtros
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<TransactionFilter>('all');
  const ITEMS_PER_PAGE = 10;

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

  // Recargar transacciones cuando cambia el filtro (sin recargar el wallet)
  const [isFirstRender, setIsFirstRender] = useState(true);
  useEffect(() => {
    if (isFirstRender) {
      setIsFirstRender(false);
      return;
    }
    if (user && !loading) {
      loadTransactions(1, true);
    }
  }, [filter]);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const [walletData, transactionsData] = await Promise.all([
        walletApi.getWallet(),
        walletApi.getTransactions(1, ITEMS_PER_PAGE, filter === 'all' ? undefined : filter),
      ]);
      setWallet(walletData);
      setTransactions(transactionsData.transactions);
      setTotalPages(transactionsData.pagination.totalPages);
      setCurrentPage(1);
    } catch (error) {
      logger.error('Error loading wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async (page: number, reset = false) => {
    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      const transactionsData = await walletApi.getTransactions(
        page,
        ITEMS_PER_PAGE,
        filter === 'all' ? undefined : filter
      );
      if (reset) {
        setTransactions(transactionsData.transactions);
      } else {
        setTransactions(prev => [...prev, ...transactionsData.transactions]);
      }
      setTotalPages(transactionsData.pagination.totalPages);
      setCurrentPage(page);
    } catch (error) {
      logger.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (currentPage < totalPages && !loadingMore) {
      loadTransactions(currentPage + 1);
    }
  };

  const handleFilterChange = (newFilter: TransactionFilter) => {
    if (newFilter !== filter) {
      setFilter(newFilter);
    }
  };

  const handleTopUpSuccess = () => {
    setShowTopUpModal(false);
    // Recargar todo desde el principio para ver la nueva transaccion
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

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: string, size: 'sm' | 'lg' = 'sm') => {
    const sizeClass = size === 'lg' ? 'w-14 h-14' : 'w-10 h-10';
    const iconSize = size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';

    if (type === 'topup') {
      return (
        <div className={`${sizeClass} rounded-full bg-green-100 flex items-center justify-center`}>
          <svg className={`${iconSize} text-green-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
      );
    }
    return (
      <div className={`${sizeClass} rounded-full bg-orange-100 flex items-center justify-center`}>
        <svg className={`${iconSize} text-orange-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
        </svg>
      </div>
    );
  };

  const getTransactionTitle = (tx: WalletTransaction) => {
    if (tx.type === 'topup') return 'Recarga de saldo';
    if (tx.type === 'platform_fee') return 'Acuerdo cerrado';
    return 'Transacción';
  };

  const getTransactionDescription = (tx: WalletTransaction) => {
    if (tx.type === 'topup') return 'Añadido a tu monedero';
    return tx.description || '';
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
    <div className="min-h-screen bg-white md:bg-transparent pb-20 md:pb-8">
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Historial</h2>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleFilterChange(option.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filter === option.value
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-primary hover:text-primary'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {transactions.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            {filter === 'all' ? (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-gray-900 font-medium text-lg mb-1">Sin movimientos aun</p>
                <p className="text-gray-500 text-sm mb-4">
                  Aqui veras tu historial de recargas y acuerdos cerrados
                </p>
                <button
                  onClick={() => setShowTopUpModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Hacer mi primera recarga
                </button>
              </>
            ) : filter === 'topup' ? (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <p className="text-gray-900 font-medium text-lg mb-1">Sin recargas</p>
                <p className="text-gray-500 text-sm mb-4">
                  Todavia no has realizado ninguna recarga en tu monedero
                </p>
                <button
                  onClick={() => setShowTopUpModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Recargar ahora
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-900 font-medium text-lg mb-1">Sin acuerdos cerrados</p>
                <p className="text-gray-500 text-sm mb-4">
                  Cuando cierres acuerdos con otros usuarios, apareceran aqui
                </p>
                <button
                  onClick={() => router.push('/explore')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Explorar experiencias
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl divide-y divide-gray-100">
              {transactions.map((tx) => (
                <button
                  key={tx.id}
                  onClick={() => setSelectedTransaction(tx)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                >
                  {getTransactionIcon(tx.type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {getTransactionTitle(tx)}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {tx.type === 'platform_fee' ? tx.description : formatDate(tx.updatedAt || tx.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}€
                    </span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>

            {/* Boton Cargar mas */}
            {currentPage < totalPages && (
              <div className="mt-4 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-700 font-medium rounded-xl border border-gray-200 hover:border-primary hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      Cargando...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      Cargar mas
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Indicador de que se han cargado todas */}
            {currentPage >= totalPages && transactions.length > ITEMS_PER_PAGE && (
              <p className="mt-4 text-center text-sm text-gray-400">
                Has visto todos los movimientos
              </p>
            )}
          </>
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
              <p className="font-medium text-gray-900">Al cerrar acuerdo, se descuenta</p>
              <p className="text-sm text-gray-500">1,50€ a cada usuario</p>
            </div>
          </div>
        </div>
      </div>

      {/* TopUp Modal */}
      {showTopUpModal && (
        <TopUpModal
          amount={selectedAmount}
          onClose={() => setShowTopUpModal(false)}
          onSuccess={handleTopUpSuccess}
        />
      )}

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Detalle del movimiento</h3>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Icon and amount */}
              <div className="flex flex-col items-center mb-6">
                {getTransactionIcon(selectedTransaction.type, 'lg')}
                <p className={`text-3xl font-bold mt-4 ${selectedTransaction.amount > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                  {selectedTransaction.amount > 0 ? '+' : ''}{selectedTransaction.amount.toFixed(2)}€
                </p>
                <p className="text-gray-500 mt-1">{getTransactionTitle(selectedTransaction)}</p>
              </div>

              {/* Details */}
              <div className="space-y-4">
                {selectedTransaction.type === 'platform_fee' && selectedTransaction.description && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Experiencia</p>
                    <p className="font-medium text-gray-900">
                      {selectedTransaction.description.split(' · ')[0]}
                    </p>
                  </div>
                )}

                {selectedTransaction.type === 'platform_fee' && selectedTransaction.otherUser && (
                  <button
                    onClick={() => {
                      setSelectedTransaction(null);
                      router.push(`/profile/${selectedTransaction.otherUser!.id}`);
                    }}
                    className="w-full bg-gray-50 rounded-xl p-4 flex items-center gap-3 hover:bg-gray-100 transition-colors text-left"
                  >
                    {selectedTransaction.otherUser.avatar ? (
                      <img
                        src={selectedTransaction.otherUser.avatar}
                        alt={selectedTransaction.otherUser.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold text-lg">
                          {selectedTransaction.otherUser.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 mb-0.5">
                        {selectedTransaction.description?.includes(' · con ')
                          ? 'Anfitrión'
                          : 'Huésped'}
                      </p>
                      <p className="font-medium text-gray-900">
                        {selectedTransaction.otherUser.name}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Fecha y hora</p>
                  <p className="font-medium text-gray-900 capitalize">
                    {formatFullDate(selectedTransaction.updatedAt || selectedTransaction.createdAt)}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Estado</p>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <p className="font-medium text-gray-900">Completado</p>
                  </div>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={() => setSelectedTransaction(null)}
                className="w-full mt-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </MainLayout>
  );
}
