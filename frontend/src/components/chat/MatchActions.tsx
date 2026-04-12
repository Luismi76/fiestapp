'use client';

import { useState } from 'react';
import { MatchStatus } from '@/types/match';
import { WalletInfo } from '@/lib/api';
import { CanReviewResponse } from '@/types/review';
import PackPurchaseModal from '@/components/PackPurchaseModal';

interface MatchActionsProps {
  status: MatchStatus;
  isHost: boolean;
  walletInfo: WalletInfo | null;
  canReviewData: CanReviewResponse | null;
  reviewSubmitted: boolean;
  hostConfirmed?: boolean;
  requesterConfirmed?: boolean;
  otherUserName?: string;
  paymentStatus?: string;
  totalPrice?: number;
  onAccept: () => void;
  onReject: () => void;
  onCancel: () => void;
  onComplete: () => void;
  onConfirm: () => void;
  onShowReviewForm: () => void;
  onOpenDispute?: () => void;
  onWalletReloaded?: () => void;
  onPay?: (paymentMode: 'immediate' | 'escrow' | 'deposit') => void;
  startDate?: string;
  depositEnabled?: boolean;
  depositPercentage?: number;
  balanceDaysBefore?: number;
}

function WalletWarning({ onTopUpSuccess }: { walletInfo: WalletInfo; onTopUpSuccess?: () => void }) {
  const [showPacks, setShowPacks] = useState(false);

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
            <p className="font-medium text-amber-800">Sin experiencias disponibles</p>
            <p className="text-sm text-amber-600">
              Necesitas al menos 1 experiencia en tu monedero para cerrar acuerdos.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowPacks(true)}
          className="w-full py-2.5 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors text-center text-sm"
        >
          Comprar pack de experiencias
        </button>
      </div>
      {showPacks && (
        <PackPurchaseModal
          onClose={() => setShowPacks(false)}
          returnTo={typeof window !== 'undefined' ? window.location.pathname : undefined}
          onSuccess={() => {
            setShowPacks(false);
            onTopUpSuccess?.();
          }}
        />
      )}
    </>
  );
}

function PaymentModeSelector({ totalPrice, startDate, onPay, onCancel, depositEnabled, depositPercentage = 20, balanceDaysBefore = 30 }: {
  totalPrice?: number;
  startDate?: string;
  onPay?: (mode: 'immediate' | 'escrow' | 'deposit') => void;
  onCancel: () => void;
  depositEnabled?: boolean;
  depositPercentage?: number;
  balanceDaysBefore?: number;
}) {
  // Calcular días hasta la experiencia una vez al montar (Date.now es impuro).
  // useState con initializer hace que Date.now solo se ejecute en el primer render.
  const [daysUntil] = useState(() => {
    if (!startDate) return 0;
    return Math.ceil(
      (new Date(startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
  });
  const canHold = daysUntil > 0 && daysUntil <= 7;
  const canUseDeposit = depositEnabled && daysUntil > balanceDaysBefore;

  const depositAmount = totalPrice ? Math.round(totalPrice * (depositPercentage / 100) * 100) / 100 : 0;
  const balanceAmount = totalPrice ? Math.round((totalPrice - depositAmount) * 100) / 100 : 0;
  const balanceDueDate = startDate ? new Date(startDate) : null;
  if (balanceDueDate) balanceDueDate.setDate(balanceDueDate.getDate() - balanceDaysBefore);

  const [mode, setMode] = useState<'immediate' | 'escrow' | 'deposit'>(
    canUseDeposit ? 'deposit' : (canHold ? 'escrow' : 'immediate'),
  );

  const hasMultipleOptions = canHold || canUseDeposit;

  return (
    <div className="mx-4 mt-3 space-y-3">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="font-medium text-blue-800 mb-1">Pago pendiente</p>
        <p className="text-sm text-blue-600 mb-3">
          El anfitrión ha aceptado tu solicitud.{hasMultipleOptions ? ' Elige cómo quieres pagar:' : ''}
        </p>

        {hasMultipleOptions ? (
          <div className="space-y-2 mb-4">
            {canUseDeposit && (
              <button
                onClick={() => setMode('deposit')}
                className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${
                  mode === 'deposit'
                    ? 'border-blue-500 bg-blue-100'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    mode === 'deposit' ? 'border-blue-500' : 'border-gray-300'
                  }`}>
                    {mode === 'deposit' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                  </div>
                  <span className="font-medium text-gray-900 text-sm">Reservar con depósito</span>
                  <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Recomendado</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Pagas <span className="font-semibold">{depositAmount.toFixed(2)}€</span> ({depositPercentage}%) ahora y reservamos tu plaza.
                  El saldo de <span className="font-semibold">{balanceAmount.toFixed(2)}€</span> se cobra automáticamente el <span className="font-semibold">{balanceDueDate?.toLocaleDateString('es-ES')}</span>.
                </p>
              </button>
            )}

            {canHold && (
              <button
                onClick={() => setMode('escrow')}
                className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${
                  mode === 'escrow'
                    ? 'border-blue-500 bg-blue-100'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    mode === 'escrow' ? 'border-blue-500' : 'border-gray-300'
                  }`}>
                    {mode === 'escrow' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                  </div>
                  <span className="font-medium text-gray-900 text-sm">Pago con retención</span>
                  {!canUseDeposit && <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Recomendado</span>}
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Stripe autoriza el cargo pero no lo cobra hasta que confirméis la experiencia. Si se cancela antes, la autorización se libera sin coste.
                </p>
              </button>
            )}

            <button
              onClick={() => setMode('immediate')}
              className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${
                mode === 'immediate'
                  ? 'border-blue-500 bg-blue-100'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  mode === 'immediate' ? 'border-blue-500' : 'border-gray-300'
                }`}>
                  {mode === 'immediate' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                </div>
                <span className="font-medium text-gray-900 text-sm">Pago completo inmediato</span>
              </div>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                El anfitrión recibe el importe total en el momento. Si cancelas, recibirás un reembolso según la política de cancelación (hasta 180 días).
              </p>
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div className="text-xs text-gray-600 leading-relaxed">
                <p className="font-medium text-gray-900 mb-1">Pago de la experiencia</p>
                <p>
                  El anfitrión recibe el importe al realizar el pago. Si la experiencia se cancela, recibirás un reembolso según la política de cancelación dentro de los <span className="font-semibold">180 días</span> siguientes al pago.
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => onPay?.(mode)}
          className="block w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-center"
        >
          {mode === 'deposit'
            ? `Pagar depósito ${depositAmount.toFixed(2)}€`
            : `Pagar ${totalPrice?.toFixed(2)}€`}
        </button>
      </div>
      <button
        onClick={onCancel}
        className="w-full py-2.5 text-sm text-gray-500 hover:text-red-500 font-medium transition-colors"
      >
        Cancelar solicitud
      </button>
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
  onConfirm,
  onShowReviewForm,
  onOpenDispute,
  onWalletReloaded,
  onPay,
  paymentStatus,
  totalPrice,
  startDate,
  depositEnabled,
  depositPercentage,
  balanceDaysBefore,
}: MatchActionsProps) {
  // El botón de confirmar solo aparece a partir de la fecha de la experiencia
  const canConfirmToday = !startDate || new Date(startDate).setHours(0, 0, 0, 0) <= new Date().setHours(0, 0, 0, 0);
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
                <p className="font-medium text-emerald-800">Experiencias disponibles</p>
                <p className="text-sm text-emerald-600">
                  Tienes {walletInfo.operationsAvailable} experiencia{walletInfo.operationsAvailable !== 1 ? 's' : ''} disponible{walletInfo.operationsAvailable !== 1 ? 's' : ''}.
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

  // Accepted - Payment pending (requester must pay)
  if (status === 'accepted' && paymentStatus === 'pending_payment' && !isHost) {
    return (
      <PaymentModeSelector
        totalPrice={totalPrice}
        startDate={startDate}
        onPay={onPay}
        onCancel={onCancel}
        depositEnabled={depositEnabled}
        depositPercentage={depositPercentage}
        balanceDaysBefore={balanceDaysBefore}
      />
    );
  }

  // Accepted - Host waiting for payment
  if (status === 'accepted' && paymentStatus === 'pending_payment' && isHost) {
    return (
      <div className="mx-4 mt-3 space-y-3">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-amber-800">Esperando pago</p>
              <p className="text-sm text-amber-600">
                El viajero debe completar el pago de {totalPrice?.toFixed(2)}€ para confirmar la reserva.
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="w-full py-2.5 text-sm text-gray-500 hover:text-red-500 font-medium transition-colors"
        >
          Cancelar
        </button>
      </div>
    );
  }

  // Accepted - escrow held, immediate released, or no payment: compact confirmation bar
  if (status === 'accepted' && (paymentStatus === 'held' || !paymentStatus || paymentStatus === 'released')) {
    const myConfirmed = isHost ? hostConfirmed : requesterConfirmed;
    const otherConfirmed = isHost ? requesterConfirmed : hostConfirmed;
    const isEscrow = paymentStatus === 'held';
    const isReleased = paymentStatus === 'released';

    const checkSvg = (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-white">
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
      </svg>
    );
    const dot = <div className="w-1.5 h-1.5 rounded-full bg-white" />;

    return (
      <div className="mx-4 mt-2 space-y-2">
        {/* Compact info bar: escrow badge + confirmation dots */}
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl text-xs">
          {isEscrow && (
            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
              {totalPrice?.toFixed(2)}€ retenido
            </span>
          )}
          {isReleased && (
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
              {totalPrice?.toFixed(2)}€ pagado
            </span>
          )}
          <div className="flex items-center gap-1.5 flex-1 justify-end">
            <span className="text-gray-400">Tu:</span>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${myConfirmed ? 'bg-emerald-500' : 'bg-gray-300'}`}>
              {myConfirmed ? checkSvg : dot}
            </div>
            <span className="text-gray-400 ml-1">{otherUserName?.split(' ')[0] || 'Otro'}:</span>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${otherConfirmed ? 'bg-emerald-500' : 'bg-gray-300'}`}>
              {otherConfirmed ? checkSvg : dot}
            </div>
          </div>
        </div>

        {/* Action buttons: only show confirm when date has arrived */}
        {!myConfirmed && canConfirmToday ? (
          <div className="flex gap-2">
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
            >
              Confirmar experiencia
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2.5 text-sm text-gray-400 hover:text-red-500 transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : !myConfirmed && !canConfirmToday ? (
          <div className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-xl">
            <p className="text-xs text-blue-600">
              Podras confirmar a partir del {startDate ? new Date(startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'dia de la experiencia'}
            </p>
            <button onClick={onCancel} className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-2">
              Cancelar
            </button>
          </div>
        ) : myConfirmed ? (
          <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 rounded-xl">
            <p className="text-xs text-emerald-600">Esperando confirmacion de {otherUserName?.split(' ')[0] || 'el otro usuario'}</p>
            <button onClick={onCancel} className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-2">
              Cancelar
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  // Accepted - fallback (other payment states)
  if (status === 'accepted') {
    return (
      <div className="mx-4 mt-2">
        <button
          onClick={onCancel}
          className="w-full py-2.5 text-sm text-gray-500 hover:text-red-500 font-medium transition-colors"
        >
          Cancelar solicitud
        </button>
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
