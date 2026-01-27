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
  onAccept: () => void;
  onReject: () => void;
  onCancel: () => void;
  onComplete: () => void;
  onShowReviewForm: () => void;
}

export default function MatchActions({
  status,
  isHost,
  walletInfo,
  canReviewData,
  reviewSubmitted,
  onAccept,
  onReject,
  onCancel,
  onComplete,
  onShowReviewForm,
}: MatchActionsProps) {
  // Pending - Host actions
  if (status === 'pending' && isHost) {
    return (
      <div className="mx-4 mt-4 space-y-3">
        {/* Wallet balance warning for host */}
        {walletInfo && !walletInfo.canOperate && (
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
                  Necesitas {walletInfo.platformFee}€ en tu monedero para usar el chat. Saldo actual: {walletInfo.balance.toFixed(2)}€
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
        )}

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
      <div className="mx-4 mt-4 space-y-3">
        {/* Wallet balance warning for requester */}
        {walletInfo && !walletInfo.canOperate && (
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
                  Necesitas {walletInfo.platformFee}€ en tu monedero para usar el chat. Saldo actual: {walletInfo.balance.toFixed(2)}€
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
        )}

        {/* Wallet OK */}
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
                  Tienes {walletInfo.balance.toFixed(2)}€. Al completar la experiencia se cobrarán {walletInfo.platformFee}€ de comisión.
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

  // Accepted
  if (status === 'accepted') {
    return (
      <div className="mx-4 mt-4 flex gap-2">
        {isHost && (
          <button
            onClick={onComplete}
            className="flex-1 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors shadow-md flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
            </svg>
            Marcar completada
          </button>
        )}
        <button
          onClick={onCancel}
          className={`${isHost ? 'flex-1' : 'w-full'} py-3 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-colors`}
        >
          Cancelar
        </button>
      </div>
    );
  }

  // Completed - Review prompt
  if (status === 'completed' && canReviewData?.canReview && !reviewSubmitted) {
    return (
      <div className="mx-4 mt-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-emerald-600">
              <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-emerald-800">¡Experiencia completada!</h3>
            <p className="text-sm text-emerald-600">
              Deja una reseña para {canReviewData.targetUser?.name}
            </p>
          </div>
          <button
            onClick={onShowReviewForm}
            className="px-4 py-2 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors shadow-md"
          >
            Reseñar
          </button>
        </div>
      </div>
    );
  }

  // Completed - Already reviewed
  if (status === 'completed' && (canReviewData?.canReview === false || reviewSubmitted)) {
    return (
      <div className="mx-4 mt-4 bg-gray-50 border border-gray-200 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-gray-500">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-700">Experiencia completada</h3>
            <p className="text-sm text-gray-500">
              {reviewSubmitted ? '¡Gracias por tu reseña!' : canReviewData?.reason || 'Ya has dejado tu reseña'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
