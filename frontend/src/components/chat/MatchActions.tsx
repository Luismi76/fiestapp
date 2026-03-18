'use client';

import { useState } from 'react';
import { MatchStatus } from '@/types/match';
import { WalletInfo } from '@/lib/api';
import { CanReviewResponse } from '@/types/review';
import TopUpModal from '@/components/TopUpModal';

interface MatchActionsProps {
  status: MatchStatus;
  isHost: boolean;
  walletInfo: WalletInfo | null;
  canReviewData: CanReviewResponse | null;
  reviewSubmitted: boolean;
  hostConfirmed?: boolean;
  requesterConfirmed?: boolean;
  otherUserName?: string;
  onAccept: () => void;
  onReject: () => void;
  onCancel: () => void;
  onComplete: () => void;
  onConfirm: () => void;
  onShowReviewForm: () => void;
  onOpenDispute?: () => void;
  onWalletReloaded?: () => void;
}

const MIN_TOPUP = 4.5;

function WalletWarning({ walletInfo, onTopUpSuccess }: { walletInfo: WalletInfo; onTopUpSuccess?: () => void }) {
  const [showTopUp, setShowTopUp] = useState(false);

  return (
    <>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-amber-600">
              <path d="M2.273 5.625A4.483 4.483 0 0 1 5.25 4.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0 0 18.75 3H5.25a3 3 0 0 0-2.977 2.625ZM2.273 8.625A4.483 4.483 0 0 1 5.25 7.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0 0 18.75 6H5.25a3 3 0 0 0-2.977 2.625ZM5.25 9a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h13.5a3 3 0 0 0 3-3v-6a3 3 0 0 0-3-3H15a.75.75 0 0 0-.75.75 2.25 2.25 0 0 1-4.5 0A.75.75 0 0 0 9 9H5.25Z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-amber-800">Saldo insuficiente</p>
            <p className="text-sm text-amber-600">
              Necesitas {walletInfo.platformFee}€ en tu monedero. Saldo actual: {walletInfo.balance.toFixed(2)}€
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowTopUp(true)}
          className="block w-full py-2 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors text-center"
        >
          Recargar {MIN_TOPUP.toFixed(2).replace('.', ',')}€
        </button>
      </div>
      {showTopUp && (
        <TopUpModal
          amount={MIN_TOPUP}
          onClose={() => setShowTopUp(false)}
          onSuccess={() => {
            setShowTopUp(false);
            onTopUpSuccess?.();
          }}
        />
      )}
    </>
  );
}

export default function MatchActions({
  status,
  isHost,
  walletInfo,
  canReviewData,
  reviewSubmitted,
  hostConfirmed,
  requesterConfirmed,
  otherUserName,
  onAccept,
  onReject,
  onCancel,
  onConfirm,
  onShowReviewForm,
  onOpenDispute,
  onWalletReloaded,
}: MatchActionsProps) {
  // Pending - Host actions
  if (status === 'pending' && isHost) {
    return (
      <div className="mx-4 mt-3 space-y-3">
        {walletInfo && !walletInfo.canOperate && <WalletWarning walletInfo={walletInfo} onTopUpSuccess={onWalletReloaded} />}
        <div className="flex gap-2">
          <button
            onClick={onAccept}
            className="flex-1 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors shadow-md flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
            </svg>
            Aceptar
          </button>
          <button
            onClick={onReject}
            className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
            Rechazar
          </button>
        </div>
      </div>
    );
  }

  // Pending - Requester actions
  if (status === 'pending' && !isHost) {
    return (
      <div className="mx-4 mt-3 space-y-3">
        {walletInfo && !walletInfo.canOperate && <WalletWarning walletInfo={walletInfo} onTopUpSuccess={onWalletReloaded} />}
        {walletInfo && walletInfo.canOperate && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-emerald-600">
                  <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-emerald-800">Saldo disponible</p>
                <p className="text-sm text-emerald-600">
                  Tienes {walletInfo.balance.toFixed(2)}€. Al completar se cobrarán {walletInfo.platformFee}€ de comisión.
                </p>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={onCancel}
          className="w-full py-3 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-colors"
        >
          Cancelar solicitud
        </button>
      </div>
    );
  }

  // Accepted - Confirmation + cancel
  if (status === 'accepted') {
    const myConfirmed = isHost ? hostConfirmed : requesterConfirmed;
    const otherConfirmed = isHost ? requesterConfirmed : hostConfirmed;

    return (
      <div className="mx-4 mt-3 space-y-3">
        {/* Confirmation status */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Confirmación de experiencia</div>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                myConfirmed ? 'bg-emerald-500' : 'bg-gray-200'
              }`}>
                {myConfirmed ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-white">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <div className="w-2 h-2 rounded-full bg-gray-400" />
                )}
              </div>
              <span className={`text-sm font-medium ${myConfirmed ? 'text-emerald-700' : 'text-gray-600'}`}>
                Tu {myConfirmed ? 'has confirmado' : 'pendiente de confirmar'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                otherConfirmed ? 'bg-emerald-500' : 'bg-gray-200'
              }`}>
                {otherConfirmed ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-white">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <div className="w-2 h-2 rounded-full bg-gray-400" />
                )}
              </div>
              <span className={`text-sm font-medium ${otherConfirmed ? 'text-emerald-700' : 'text-gray-500'}`}>
                {otherUserName || 'El otro usuario'} {otherConfirmed ? 'ha confirmado' : 'pendiente'}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {!myConfirmed ? (
            <button
              onClick={onConfirm}
              className="flex-1 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-md flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
              </svg>
              Confirmar experiencia
            </button>
          ) : (
            <div className="flex-1 py-3 bg-emerald-50 text-emerald-600 font-semibold rounded-xl text-center text-sm">
              Esperando confirmación de {otherUserName || 'el otro usuario'}
            </div>
          )}
          <button
            onClick={onCancel}
            className="py-3 px-4 bg-red-50 text-red-500 font-semibold rounded-xl hover:bg-red-100 transition-colors text-sm"
          >
            Cancelar
          </button>
        </div>

        {/* Dispute button */}
        {onOpenDispute && (
          <button
            onClick={onOpenDispute}
            className="w-full py-2.5 text-xs text-gray-400 hover:text-red-500 font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
            Reportar un problema
          </button>
        )}
      </div>
    );
  }

  // Completed
  if (status === 'completed') {
    const canReview = canReviewData?.canReview && !reviewSubmitted;
    const reviewDone = canReviewData?.canReview === false || reviewSubmitted;

    return (
      <div className="mx-4 mt-3 flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-500 flex-shrink-0">
            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-emerald-700 truncate">
            {reviewDone
              ? (reviewSubmitted ? 'Completada — reseña enviada' : 'Experiencia completada')
              : 'Solicitud aceptada'}
          </span>
        </div>
        {canReview && (
          <button
            onClick={onShowReviewForm}
            className="cursor-pointer px-3 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors flex-shrink-0 flex items-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M10.868 2.884c.321-.772 1.415-.772 1.736 0l1.83 4.401 4.753.381c.833.067 1.171 1.107.536 1.651l-3.615 3.099 1.103 4.632c.194.813-.691 1.456-1.405 1.02L10 15.01l-4.806 2.958c-.714.436-1.6-.207-1.405-1.02l1.103-4.632-3.615-3.1c-.635-.543-.297-1.583.536-1.65l4.753-.382 1.83-4.4Z" clipRule="evenodd" />
            </svg>
            Resena
          </button>
        )}
        {onOpenDispute && (
          <button
            onClick={onOpenDispute}
            className="cursor-pointer p-2 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
            aria-label="Reportar un problema"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  return null;
}
