'use client';

import Link from 'next/link';
import { MatchStatus } from '@/types/match';
import { WalletInfo } from '@/lib/api';
import { CanReviewResponse } from '@/types/review';

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
}

function WalletWarning({ walletInfo }: { walletInfo: WalletInfo }) {
  return (
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
      <Link
        href="/wallet"
        className="block w-full py-2 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors text-center"
      >
        Recargar monedero
      </Link>
    </div>
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
  onComplete,
  onConfirm,
  onShowReviewForm,
  onOpenDispute,
}: MatchActionsProps) {
  // Pending - Host actions
  if (status === 'pending' && isHost) {
    return (
      <div className="mx-4 mt-3 space-y-3">
        {walletInfo && !walletInfo.canOperate && <WalletWarning walletInfo={walletInfo} />}
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
        {walletInfo && !walletInfo.canOperate && <WalletWarning walletInfo={walletInfo} />}
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
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Confirmacion de experiencia</div>
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
              className="flex-1 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors shadow-md flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
              </svg>
              Confirmar experiencia
            </button>
          ) : (
            <div className="flex-1 py-3 bg-emerald-50 text-emerald-600 font-semibold rounded-xl text-center text-sm">
              Esperando confirmacion de {otherUserName || 'el otro usuario'}
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

  // Completed - Review prompt
  if (status === 'completed' && canReviewData?.canReview && !reviewSubmitted) {
    return (
      <div className="mx-4 mt-3 space-y-2">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="font-bold text-lg text-emerald-800 mb-1">Experiencia completada</h3>
          <p className="text-sm text-emerald-600 mb-4">
            ¿Que tal fue con {canReviewData.targetUser?.name}? Tu opinion ayuda a la comunidad.
          </p>
          <button
            onClick={onShowReviewForm}
            className="w-full py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors shadow-md flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
            </svg>
            Dejar resena
          </button>
        </div>
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

  // Completed - Already reviewed
  if (status === 'completed' && (canReviewData?.canReview === false || reviewSubmitted)) {
    return (
      <div className="mx-4 mt-3 space-y-2">
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-gray-500">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-700">Experiencia completada</h3>
              <p className="text-sm text-gray-500">
                {reviewSubmitted ? '¡Gracias por tu resena!' : canReviewData?.reason || 'Ya has dejado tu resena'}
              </p>
            </div>
          </div>
        </div>
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

  return null;
}
