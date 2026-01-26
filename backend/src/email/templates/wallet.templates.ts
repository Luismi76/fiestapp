/**
 * Templates de email para eventos relacionados con wallet y pagos
 */

import {
  getBaseTemplate,
  getButton,
  getInfoBox,
  getDivider,
  formatDate,
  formatCurrency,
} from './base.template';

interface WalletChargedEmailData {
  userName: string;
  amount: number;
  currency?: string;
  transactionType: 'topup' | 'earnings' | 'refund';
  description: string;
  newBalance: number;
  walletUrl: string;
}

export function getWalletChargedTemplate(data: WalletChargedEmailData): string {
  const typeLabels = {
    topup: 'Recarga de saldo',
    earnings: 'Ingresos por experiencia',
    refund: 'Reembolso recibido',
  };

  const typeColors = {
    topup: 'primary' as const,
    earnings: 'green' as const,
    refund: 'orange' as const,
  };

  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 24px;">
      Hola, ${data.userName}
    </h2>
    <p style="color: #4b5563; margin: 0 0 25px; font-size: 16px; line-height: 1.6;">
      Se ha acreditado un nuevo movimiento en tu wallet de FiestApp.
    </p>

    ${getInfoBox(
      `
      <h4 style="margin: 0 0 12px; font-size: 16px;">
        ${typeLabels[data.transactionType]}
      </h4>
      <p style="margin: 0 0 8px; font-size: 14px;">
        <strong>Monto:</strong> <span style="color: #10b981; font-size: 18px; font-weight: bold;">+${formatCurrency(data.amount, data.currency)}</span>
      </p>
      <p style="margin: 0 0 8px; font-size: 14px;">
        <strong>Concepto:</strong> ${data.description}
      </p>
      <p style="margin: 10px 0 0; font-size: 14px; padding-top: 10px; border-top: 1px solid rgba(0,0,0,0.1);">
        <strong>Nuevo saldo:</strong> ${formatCurrency(data.newBalance, data.currency)}
      </p>
      `,
      'success',
    )}

    ${getButton('Ver mi wallet', data.walletUrl, typeColors[data.transactionType])}

    ${getDivider()}
    <p style="color: #9ca3af; margin: 0; font-size: 13px;">
      Puedes utilizar tu saldo para reservar experiencias o solicitar una transferencia a tu cuenta bancaria.
    </p>
  `;

  return getBaseTemplate(content, {
    title: typeLabels[data.transactionType],
    preheader: `Has recibido ${formatCurrency(data.amount, data.currency)} en tu wallet`,
    headerGradient: typeColors[data.transactionType],
    headerSubtitle: typeLabels[data.transactionType],
  });
}

interface WalletLowBalanceEmailData {
  userName: string;
  currentBalance: number;
  currency?: string;
  threshold: number;
  topupUrl: string;
}

export function getWalletLowBalanceTemplate(
  data: WalletLowBalanceEmailData,
): string {
  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 24px;">
      Hola, ${data.userName}
    </h2>
    <p style="color: #4b5563; margin: 0 0 25px; font-size: 16px; line-height: 1.6;">
      Te avisamos de que tu saldo en FiestApp esta bajo. Recarga para no perderte ninguna experiencia.
    </p>

    ${getInfoBox(
      `
      <p style="margin: 0 0 8px; font-size: 14px;">
        <strong>Saldo actual:</strong> <span style="color: #dc2626; font-size: 18px; font-weight: bold;">${formatCurrency(data.currentBalance, data.currency)}</span>
      </p>
      <p style="margin: 0; font-size: 13px; color: #78350f;">
        Tu saldo esta por debajo de ${formatCurrency(data.threshold, data.currency)}
      </p>
      `,
      'warning',
    )}

    ${getButton('Recargar saldo', data.topupUrl, 'orange')}

    ${getDivider()}
    <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.6;">
      <strong>¿Sabias que...?</strong> Puedes configurar alertas de saldo bajo desde tu perfil para recibir notificaciones cuando tu saldo este bajo.
    </p>
  `;

  return getBaseTemplate(content, {
    title: 'Saldo bajo en tu wallet',
    preheader: `Tu saldo es de ${formatCurrency(data.currentBalance, data.currency)}`,
    headerGradient: 'orange',
    headerSubtitle: 'Aviso de saldo bajo',
  });
}

interface PaymentReceiptEmailData {
  userName: string;
  transactionId: string;
  amount: number;
  currency?: string;
  paymentMethod: 'stripe' | 'paypal' | 'wallet';
  experienceTitle: string;
  experienceCity: string;
  startDate: Date;
  hostName: string;
  matchUrl: string;
}

export function getPaymentReceiptTemplate(
  data: PaymentReceiptEmailData,
): string {
  const paymentMethodLabels = {
    stripe: 'Tarjeta de credito/debito',
    paypal: 'PayPal',
    wallet: 'Saldo de FiestApp',
  };

  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 24px;">
      Recibo de pago
    </h2>
    <p style="color: #4b5563; margin: 0 0 25px; font-size: 16px; line-height: 1.6;">
      Hola ${data.userName}, gracias por tu reserva. Aqui tienes el resumen de tu pago.
    </p>

    <table role="presentation" style="width: 100%; background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <tr>
        <td>
          <table role="presentation" style="width: 100%;">
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #6b7280; font-size: 14px;">ID de transaccion</span><br>
                <span style="color: #1f2937; font-size: 14px; font-weight: 600;">#${data.transactionId.slice(0, 12).toUpperCase()}</span>
              </td>
              <td style="padding: 8px 0; text-align: right;">
                <span style="color: #6b7280; font-size: 14px;">Fecha</span><br>
                <span style="color: #1f2937; font-size: 14px; font-weight: 600;">${new Date().toLocaleDateString('es-ES')}</span>
              </td>
            </tr>
          </table>
          <div style="border-top: 1px solid #e5e7eb; margin: 15px 0;"></div>
          <table role="presentation" style="width: 100%;">
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #1f2937; font-size: 14px; font-weight: 600;">${data.experienceTitle}</span><br>
                <span style="color: #6b7280; font-size: 13px;">${data.experienceCity} - ${formatDate(data.startDate)}</span><br>
                <span style="color: #6b7280; font-size: 13px;">Con ${data.hostName}</span>
              </td>
              <td style="padding: 8px 0; text-align: right; vertical-align: top;">
                <span style="color: #1f2937; font-size: 16px; font-weight: 700;">${formatCurrency(data.amount, data.currency)}</span>
              </td>
            </tr>
          </table>
          <div style="border-top: 1px solid #e5e7eb; margin: 15px 0;"></div>
          <table role="presentation" style="width: 100%;">
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #6b7280; font-size: 14px;">Metodo de pago</span>
              </td>
              <td style="padding: 8px 0; text-align: right;">
                <span style="color: #1f2937; font-size: 14px;">${paymentMethodLabels[data.paymentMethod]}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #1f2937; font-size: 16px; font-weight: 700;">Total pagado</span>
              </td>
              <td style="padding: 8px 0; text-align: right;">
                <span style="color: #10b981; font-size: 20px; font-weight: 700;">${formatCurrency(data.amount, data.currency)}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${getButton('Ver mi reserva', data.matchUrl, 'green')}

    ${getDivider()}
    <p style="color: #9ca3af; margin: 0; font-size: 13px;">
      Este email sirve como comprobante de tu pago. Guardalo para tus registros.
      El pago se mantendra en custodia hasta que se complete la experiencia.
    </p>
  `;

  return getBaseTemplate(content, {
    title: 'Recibo de pago - FiestApp',
    preheader: `Pago de ${formatCurrency(data.amount, data.currency)} confirmado`,
    headerGradient: 'green',
    headerSubtitle: 'Pago confirmado',
  });
}

interface PayoutProcessedEmailData {
  hostName: string;
  amount: number;
  currency?: string;
  experienceCount: number;
  bankLast4?: string;
  estimatedArrival: string;
  walletUrl: string;
}

export function getPayoutProcessedTemplate(
  data: PayoutProcessedEmailData,
): string {
  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 24px;">
      Hola, ${data.hostName}
    </h2>
    <p style="color: #4b5563; margin: 0 0 25px; font-size: 16px; line-height: 1.6;">
      ¡Buenas noticias! Hemos procesado tu solicitud de retiro de fondos.
    </p>

    ${getInfoBox(
      `
      <h4 style="margin: 0 0 12px; font-size: 16px;">Detalles del retiro</h4>
      <p style="margin: 0 0 8px; font-size: 14px;">
        <strong>Monto transferido:</strong> <span style="color: #10b981; font-size: 18px; font-weight: bold;">${formatCurrency(data.amount, data.currency)}</span>
      </p>
      <p style="margin: 0 0 8px; font-size: 14px;">
        <strong>Experiencias incluidas:</strong> ${data.experienceCount}
      </p>
      ${data.bankLast4 ? `<p style="margin: 0 0 8px; font-size: 14px;"><strong>Cuenta destino:</strong> ****${data.bankLast4}</p>` : ''}
      <p style="margin: 10px 0 0; font-size: 13px; color: #065f46;">
        Llegada estimada: ${data.estimatedArrival}
      </p>
      `,
      'success',
    )}

    ${getButton('Ver historial de pagos', data.walletUrl, 'green')}

    ${getDivider()}
    <p style="color: #9ca3af; margin: 0; font-size: 13px;">
      El tiempo de llegada puede variar segun tu entidad bancaria. Si no recibes los fondos en el plazo indicado, contacta con nuestro soporte.
    </p>
  `;

  return getBaseTemplate(content, {
    title: 'Retiro de fondos procesado',
    preheader: `Hemos transferido ${formatCurrency(data.amount, data.currency)} a tu cuenta`,
    headerGradient: 'green',
    headerSubtitle: 'Retiro procesado',
  });
}
