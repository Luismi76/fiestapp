'use client';

import { Match } from '@/types/match';

interface Props {
  match: Match;
  compact?: boolean;
}

/**
 * Muestra el estado del pago de una reserva (payment plan o pago único).
 * - Sin pago → "Sin pago requerido" o "Pendiente de pago"
 * - Pago único inmediato → "Pagado"
 * - Escrow retenido → "Retenido"
 * - Reserva con depósito → "Depósito pagado · Saldo el DD/MM"
 * - Todo completado → "Pagado totalmente"
 */
export default function BookingPaymentStatus({ match, compact = false }: Props) {
  const { paymentPlan, paymentStatus, totalPrice } = match;

  // Reserva con depósito
  if (paymentPlan) {
    if (paymentPlan.status === 'completed' || paymentPlan.balancePaid) {
      return (
        <Badge color="green" icon="check">
          Pagado totalmente · {paymentPlan.totalAmount.toFixed(2)}€
        </Badge>
      );
    }
    if (paymentPlan.status === 'failed') {
      return (
        <Badge color="red" icon="alert">
          Pago del saldo fallido
        </Badge>
      );
    }
    if (paymentPlan.status === 'cancelled') {
      return <Badge color="gray" icon="x">Cancelado</Badge>;
    }
    if (paymentPlan.depositPaid) {
      const dueDate = new Date(paymentPlan.balanceDueDate);
      const dueStr = dueDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      return (
        <div className={compact ? 'text-xs' : 'text-sm'}>
          <Badge color="blue" icon="check">
            Depósito {paymentPlan.depositAmount.toFixed(2)}€ pagado
          </Badge>
          <p className="text-[11px] text-gray-500 mt-1">
            Saldo de {paymentPlan.balanceAmount.toFixed(2)}€ el {dueStr}
          </p>
        </div>
      );
    }
    return <Badge color="amber" icon="clock">Depósito pendiente</Badge>;
  }

  // Pago único
  if (!totalPrice || totalPrice === 0) {
    return <Badge color="gray" icon="info">Sin pago</Badge>;
  }

  switch (paymentStatus) {
    case 'pending_payment':
      return <Badge color="amber" icon="clock">Pago pendiente · {totalPrice.toFixed(2)}€</Badge>;
    case 'held':
      return <Badge color="blue" icon="lock">Retenido · {totalPrice.toFixed(2)}€</Badge>;
    case 'released':
    case 'paid':
      return <Badge color="green" icon="check">Pagado · {totalPrice.toFixed(2)}€</Badge>;
    case 'refunded':
      return <Badge color="gray" icon="undo">Reembolsado</Badge>;
    default:
      return <Badge color="gray" icon="info">Pendiente de pago</Badge>;
  }
}

function Badge({ color, icon, children }: { color: 'green' | 'blue' | 'amber' | 'red' | 'gray'; icon: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
  };
  const icons: Record<string, string> = {
    check: 'M5 13l4 4L19 7',
    clock: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
    lock: 'M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4',
    alert: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    undo: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6',
    x: 'M6 18L18 6M6 6l12 12',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colors[color]}`}>
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons[icon]} />
      </svg>
      {children}
    </span>
  );
}
