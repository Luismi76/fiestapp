'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { walletApi, WalletInfo, WalletTransaction } from '@/lib/api';
import PackPurchaseModal from '@/components/PackPurchaseModal';
import MainLayout from '@/components/MainLayout';
import logger from '@/lib/logger';
import Image from 'next/image';

// Tipos de filtro disponibles
type TransactionFilter = 'all' | 'topup' | 'pack_purchase' | 'platform_fee' | 'refund';

const FILTER_OPTIONS: { value: TransactionFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pack_purchase', label: 'Packs' },
  { value: 'platform_fee', label: 'Acuerdos' },
  { value: 'refund', label: 'Reembolsos' },
];

export default function WalletPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPackModal, setShowPackModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | null>(null);

  // Estados para paginacion y filtros
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<TransactionFilter>('all');
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Recargar transacciones cuando cambia el filtro (sin recargar el wallet)
  const [isFirstRender, setIsFirstRender] = useState(true);

  const loadTransactions = useCallback(async (page: number, reset = false) => {
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
  }, [filter]);

  const loadWalletData = useCallback(async () => {
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
  }, [filter]);

  useEffect(() => {
    if (user) {
      loadWalletData();
    }
  }, [user, loadWalletData]);

  useEffect(() => {
    if (isFirstRender) {
      setIsFirstRender(false);
      return;
    }
    if (user && !loading) {
      loadTransactions(1, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

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

  const handlePackSuccess = () => {
    setShowPackModal(false);
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
    if (type === 'refund') {
      return (
        <div className={`${sizeClass} rounded-full bg-blue-100 flex items-center justify-center`}>
          <svg className={`${iconSize} text-blue-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
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
    if (tx.type === 'pack_purchase') return tx.description || 'Compra de pack';
    if (tx.type === 'topup') return 'Recarga de saldo';
    if (tx.type === 'platform_fee') return 'Experiencia';
    if (tx.type === 'refund') return 'Reembolso';
    return 'Transacción';
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
    <div className="min-h-screen bg-white md:bg-transparent">
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
          <div className="text-center mb-4">
            <p className="text-gray-500 text-sm mb-1">Experiencias disponibles</p>
            <p className="text-5xl font-bold text-gray-900">
              {wallet?.operationsAvailable || 0}
            </p>
            {(wallet?.balance ?? 0) > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                + {wallet?.balance.toFixed(2)}€ de saldo anterior
              </p>
            )}
          </div>

          {wallet && !wallet.canOperate && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-amber-700 text-sm">
                  Compra un pack para poder cerrar acuerdos.
                </span>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowPackModal(true)}
            className="w-full btn-primary py-3 rounded-xl font-semibold"
          >
            Comprar pack de experiencias
          </button>
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
                  Aqui veras el historial de comisiones, recargas y reembolsos de tu monedero.
                </p>
                <button
                  onClick={() => setShowPackModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Comprar mi primer pack
                </button>
              </>
            ) : filter === 'topup' ? (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <p className="text-gray-900 font-medium text-lg mb-1">Sin compras</p>
                <p className="text-gray-500 text-sm mb-4">
                  Todavia no has comprado ningun pack de experiencias
                </p>
                <button
                  onClick={() => setShowPackModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Comprar pack
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
                  Aqui veras el historial de comisiones, recargas y reembolsos de tu monedero.
                </p>
                <button
                  onClick={() => router.push('/experiences')}
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
                  <div className="flex flex-col items-end gap-0.5">
                    <span className={`font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                      {`${tx.amount > 0 ? '+' : ''}${tx.amount.toFixed(2)}€`}
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
                      Cargar más
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
              <p className="font-medium text-gray-900">Compra un pack</p>
              <p className="text-sm text-gray-500">Cuanto mayor el pack, más experiencias gratis</p>
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
              <p className="font-medium text-gray-900">Al cerrar acuerdo se usa 1 experiencia</p>
              <p className="text-sm text-gray-500">Tanto viajero como anfitrión</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pack Purchase Modal */}
      {showPackModal && (
        <PackPurchaseModal
          onClose={() => setShowPackModal(false)}
          onSuccess={handlePackSuccess}
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

                {selectedTransaction.type === 'topup' && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Recarga de monedero</p>
                    <p className="font-medium text-gray-900">{selectedTransaction.amount.toFixed(2)}€ abonados a tu saldo</p>
                  </div>
                )}

                {selectedTransaction.type === 'refund' && selectedTransaction.description && (
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Concepto</p>
                    <p className="font-medium text-gray-900">{selectedTransaction.description}</p>
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
                      <Image
                        src={selectedTransaction.otherUser.avatar}
                        alt={selectedTransaction.otherUser.name}
                        className="w-12 h-12 rounded-full object-cover"
                        width={48} height={48} unoptimized
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
