/**
 * Templates de email para eventos relacionados con disputas
 */

import {
  getBaseTemplate,
  getButton,
  getInfoBox,
  getDivider,
  formatCurrency,
} from './base.template';

interface DisputeOpenedEmailData {
  userName: string;
  isOpener: boolean;
  disputeId: string;
  experienceTitle: string;
  otherPartyName: string;
  reason: string;
  description: string;
  disputeUrl: string;
}

export function getDisputeOpenedTemplate(data: DisputeOpenedEmailData): string {
  const title = data.isOpener
    ? 'Tu disputa ha sido registrada'
    : 'Se ha abierto una disputa contigo';

  const intro = data.isOpener
    ? 'Hemos recibido tu solicitud de disputa. Nuestro equipo la revisara lo antes posible.'
    : `${data.otherPartyName} ha abierto una disputa relacionada con la experiencia que compartisteis. Por favor, revisa los detalles y responde.`;

  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 24px;">
      Hola, ${data.userName}
    </h2>
    <p style="color: #4b5563; margin: 0 0 25px; font-size: 16px; line-height: 1.6;">
      ${intro}
    </p>

    ${getInfoBox(
      `
      <h4 style="margin: 0 0 12px; font-size: 16px;">Detalles de la disputa</h4>
      <p style="margin: 0 0 8px; font-size: 14px;">
        <strong>ID de disputa:</strong> #${data.disputeId.slice(0, 8).toUpperCase()}
      </p>
      <p style="margin: 0 0 8px; font-size: 14px;">
        <strong>Experiencia:</strong> ${data.experienceTitle}
      </p>
      <p style="margin: 0 0 8px; font-size: 14px;">
        <strong>Motivo:</strong> ${data.reason}
      </p>
      ${data.description ? `<p style="margin: 10px 0 0; font-size: 13px;"><strong>Descripcion:</strong> ${data.description.slice(0, 200)}${data.description.length > 200 ? '...' : ''}</p>` : ''}
      `,
      data.isOpener ? 'info' : 'warning',
    )}

    ${getButton('Ver disputa', data.disputeUrl, data.isOpener ? 'primary' : 'orange')}

    ${getDivider()}
    <p style="color: #6b7280; margin: 0 0 10px; font-size: 14px; font-weight: 600;">
      ¿Que puedes hacer?
    </p>
    <ul style="color: #6b7280; margin: 10px 0 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
      <li>Revisa los detalles de la disputa</li>
      <li>Aporta evidencias (capturas, fotos, mensajes)</li>
      <li>Mantente atento a las notificaciones</li>
      <li>Responde a las preguntas del equipo de soporte</li>
    </ul>

    ${getDivider()}
    <p style="color: #9ca3af; margin: 0; font-size: 13px;">
      Nuestro equipo revisara el caso en un plazo de 24-72 horas habiles. Te mantendremos informado de cualquier actualizacion.
    </p>
  `;

  return getBaseTemplate(content, {
    title,
    preheader: `Disputa relacionada con ${data.experienceTitle}`,
    headerGradient: data.isOpener ? 'primary' : 'orange',
    headerSubtitle: title,
  });
}

interface DisputeMessageEmailData {
  userName: string;
  senderName: string;
  isAdmin: boolean;
  disputeId: string;
  messagePreview: string;
  disputeUrl: string;
}

export function getDisputeMessageTemplate(
  data: DisputeMessageEmailData,
): string {
  const sender = data.isAdmin ? 'el equipo de FiestApp' : data.senderName;

  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 24px;">
      Hola, ${data.userName}
    </h2>
    <p style="color: #4b5563; margin: 0 0 25px; font-size: 16px; line-height: 1.6;">
      Has recibido un nuevo mensaje en tu disputa de ${sender}.
    </p>

    ${getInfoBox(
      `
      <p style="margin: 0 0 8px; font-size: 14px;">
        <strong>De:</strong> ${sender}
      </p>
      <p style="margin: 10px 0 0; font-size: 14px; font-style: italic;">
        "${data.messagePreview.slice(0, 200)}${data.messagePreview.length > 200 ? '...' : ''}"
      </p>
      `,
      data.isAdmin ? 'info' : 'warning',
    )}

    ${getButton('Ver mensaje completo', data.disputeUrl, 'primary')}
  `;

  return getBaseTemplate(content, {
    title: 'Nuevo mensaje en tu disputa',
    preheader: `${sender} te ha enviado un mensaje`,
    headerGradient: 'primary',
    headerSubtitle: 'Nuevo mensaje en disputa',
  });
}

interface DisputeResolvedEmailData {
  userName: string;
  disputeId: string;
  experienceTitle: string;
  resolution:
    | 'RESOLVED_REFUND'
    | 'RESOLVED_PARTIAL_REFUND'
    | 'RESOLVED_NO_REFUND'
    | 'CLOSED';
  resolutionDescription: string;
  refundAmount?: number;
  refundPercentage?: number;
  currency?: string;
  disputeUrl: string;
  walletUrl: string;
}

export function getDisputeResolvedTemplate(
  data: DisputeResolvedEmailData,
): string {
  const resolutionTitles = {
    RESOLVED_REFUND: 'Disputa resuelta - Reembolso total',
    RESOLVED_PARTIAL_REFUND: 'Disputa resuelta - Reembolso parcial',
    RESOLVED_NO_REFUND: 'Disputa resuelta - Sin reembolso',
    CLOSED: 'Disputa cerrada',
  };

  const resolutionColors = {
    RESOLVED_REFUND: 'green' as const,
    RESOLVED_PARTIAL_REFUND: 'orange' as const,
    RESOLVED_NO_REFUND: 'red' as const,
    CLOSED: 'primary' as const,
  };

  const hasRefund =
    data.refundAmount !== undefined &&
    data.refundAmount > 0 &&
    (data.resolution === 'RESOLVED_REFUND' ||
      data.resolution === 'RESOLVED_PARTIAL_REFUND');

  const refundSection = hasRefund
    ? getInfoBox(
        `
      <h4 style="margin: 0 0 10px; font-size: 16px;">Detalles del reembolso</h4>
      <p style="margin: 0 0 8px; font-size: 14px;">
        <strong>Porcentaje:</strong> ${data.refundPercentage}%
      </p>
      <p style="margin: 0; font-size: 14px;">
        <strong>Monto:</strong> ${formatCurrency(data.refundAmount!, data.currency)}
      </p>
      <p style="margin: 10px 0 0; font-size: 13px; color: #065f46;">
        El reembolso se procesara en las proximas 24-48 horas.
      </p>
      `,
        'success',
      )
    : '';

  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 24px;">
      Hola, ${data.userName}
    </h2>
    <p style="color: #4b5563; margin: 0 0 25px; font-size: 16px; line-height: 1.6;">
      Te informamos que tu disputa relacionada con <strong>${data.experienceTitle}</strong> ha sido resuelta.
    </p>

    ${getInfoBox(
      `
      <h4 style="margin: 0 0 12px; font-size: 16px;">
        ${resolutionTitles[data.resolution]}
      </h4>
      <p style="margin: 0 0 8px; font-size: 14px;">
        <strong>ID de disputa:</strong> #${data.disputeId.slice(0, 8).toUpperCase()}
      </p>
      <p style="margin: 10px 0 0; font-size: 14px;">
        <strong>Resolucion:</strong> ${data.resolutionDescription}
      </p>
      `,
      data.resolution === 'RESOLVED_REFUND' ||
        data.resolution === 'RESOLVED_PARTIAL_REFUND'
        ? 'success'
        : data.resolution === 'RESOLVED_NO_REFUND'
          ? 'error'
          : 'info',
    )}

    ${refundSection}

    ${getButton('Ver detalles de la disputa', data.disputeUrl, resolutionColors[data.resolution])}

    ${
      hasRefund
        ? `
    <table role="presentation" style="width: 100%; margin: 20px 0;">
      <tr>
        <td style="text-align: center;">
          <a href="${data.walletUrl}" style="color: #2563eb; text-decoration: none; font-size: 14px;">
            Ver mi wallet
          </a>
        </td>
      </tr>
    </table>
    `
        : ''
    }

    ${getDivider()}
    <p style="color: #9ca3af; margin: 0; font-size: 13px;">
      Si tienes alguna pregunta sobre esta resolucion, puedes contactarnos a traves del centro de ayuda.
    </p>
  `;

  return getBaseTemplate(content, {
    title: resolutionTitles[data.resolution],
    preheader: `Disputa #${data.disputeId.slice(0, 8).toUpperCase()} resuelta`,
    headerGradient: resolutionColors[data.resolution],
    headerSubtitle: resolutionTitles[data.resolution],
  });
}
