'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';

interface PayPalButtonProps {
  matchId: string;
  amount: number;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export default function PayPalButton({
  matchId,
  amount,
  onSuccess,
  onError,
}: PayPalButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePayPalClick = async () => {
    setLoading(true);

    try {
      // Create PayPal order
      const response = await api.post(`/payments/paypal/create/${matchId}`, {
        returnUrl: `${window.location.origin}/payments/paypal/success?matchId=${matchId}`,
        cancelUrl: `${window.location.origin}/payments/paypal/cancel?matchId=${matchId}`,
      });

      // Redirect to PayPal for approval
      if (response.data.approvalUrl) {
        // Store matchId in sessionStorage for the return page
        sessionStorage.setItem('paypal_pending_match', matchId);
        window.location.href = response.data.approvalUrl;
      } else {
        onError('No se pudo obtener el enlace de pago de PayPal');
      }
    } catch (err) {
      onError(getErrorMessage(err, 'Error al iniciar pago con PayPal'));
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayPalClick}
      disabled={loading}
      className="w-full py-4 bg-[#0070ba] hover:bg-[#003087] text-white font-semibold rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Conectando con PayPal...
        </span>
      ) : (
        <>
          {/* PayPal Logo */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19.554 9.488c.121.563.106 1.246-.04 2.014-.582 2.978-2.477 4.466-5.669 4.466h-.674a.703.703 0 0 0-.694.593l-.568 3.528a.538.538 0 0 1-.533.456H8.82a.336.336 0 0 1-.332-.392l.189-1.198.045-.283.75-4.752.047-.282a.703.703 0 0 1 .694-.593h.465c2.881 0 5.14-1.168 5.8-4.546.272-1.388.131-2.549-.474-3.356.143.108.277.228.401.361.577.615.919 1.435 1.148 2.484z" fill="#fff"/>
            <path d="M8.971 6.716c.127-.016.255-.024.384-.024h4.608c1.098 0 2.124.068 3.016.231a6.24 6.24 0 0 1 .947.235c.339.109.646.25.909.424.577.615.919 1.435 1.148 2.484.121.563.106 1.246-.04 2.014-.582 2.978-2.477 4.466-5.669 4.466h-.674a.703.703 0 0 0-.694.593l-.568 3.528a.538.538 0 0 1-.533.456H8.82a.336.336 0 0 1-.332-.392l.189-1.198 .045-.283.75-4.752.047-.282a.703.703 0 0 1 .694-.593h.465c2.881 0 5.14-1.168 5.8-4.546.272-1.388.131-2.549-.474-3.356a3.97 3.97 0 0 0-.401-.361 4.99 4.99 0 0 0-.909-.424 6.24 6.24 0 0 0-.947-.235c-.892-.163-1.918-.231-3.016-.231H8.971z" fill="#fff" opacity=".7"/>
            <path d="M7.66 6.985a.702.702 0 0 1 .694-.593h4.608c1.098 0 2.124.068 3.016.231a6.24 6.24 0 0 1 .947.235 4.99 4.99 0 0 1 .909.424c.124.096.242.2.351.314.577.615.919 1.435 1.148 2.484.121.563.106 1.246-.04 2.014-.582 2.978-2.477 4.466-5.669 4.466h-.674a.703.703 0 0 0-.694.593l-.568 3.528a.538.538 0 0 1-.533.456H8.82a.336.336 0 0 1-.332-.392l1.029-6.515.047-.282a.703.703 0 0 1 .694-.593h.465c2.881 0 5.14-1.168 5.8-4.546.272-1.388.131-2.549-.474-3.356a3.97 3.97 0 0 0-.401-.361 4.99 4.99 0 0 0-.909-.424 6.24 6.24 0 0 0-.947-.235c-.892-.163-1.918-.231-3.016-.231H8.354a.702.702 0 0 0-.694.593L5.902 20.13a.403.403 0 0 0 .398.47h2.917l.735-4.662.708-8.953z" fill="#fff"/>
          </svg>
          <span>Pagar {amount}€ con PayPal</span>
        </>
      )}
    </button>
  );
}
