/**
 * Templates de email para eventos relacionados con matches
 */

import {
  getBaseTemplate,
  getButton,
  getInfoBox,
  getDivider,
  formatDate,
  formatCurrency,
} from './base.template';

interface MatchRequestEmailData {
  hostName: string;
  requesterName: string;
  experienceTitle: string;
  experienceCity: string;
  startDate: Date;
  participants: number;
  totalPrice: number;
  currency?: string;
  matchUrl: string;
  requesterAvatar?: string;
}

export function getMatchRequestTemplate(data: MatchRequestEmailData): string {
  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 24px;">
      Hola, ${data.hostName}
    </h2>
    <p style="color: #4b5563; margin: 0 0 25px; font-size: 16px; line-height: 1.6;">
      <strong>${data.requesterName}</strong> quiere vivir tu experiencia. Revisa los detalles y decide si aceptas la solicitud.
    </p>

    ${getInfoBox(
      `
      <h3 style="margin: 0 0 12px; font-size: 18px;">${data.experienceTitle}</h3>
      <p style="margin: 0 0 8px; font-size: 14px;">
        <strong>Fecha:</strong> ${formatDate(data.startDate)}
      </p>
      <p style="margin: 0 0 8px; font-size: 14px;">
        <strong>Ubicacion:</strong> ${data.experienceCity}
      </p>
      <p style="margin: 0 0 8px; font-size: 14px;">
        <strong>Participantes:</strong> ${data.participants} persona${data.participants > 1 ? 's' : ''}
      </p>
      <p style="margin: 0; font-size: 14px;">
        <strong>Total:</strong> ${formatCurrency(data.totalPrice, data.currency)}
      </p>
      `,
      'info',
    )}

    ${getButton('Ver solicitud', data.matchUrl, 'primary')}

    ${getDivider()}
    <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.6;">
      Tienes 48 horas para responder a esta solicitud. Si no respondes, la solicitud se cancelara automaticamente.
    </p>
  `;

  return getBaseTemplate(content, {
    title: 'Nueva solicitud de experiencia',
    preheader: `${data.requesterName} quiere reservar ${data.experienceTitle}`,
    headerGradient: 'primary',
    headerSubtitle: 'Nueva solicitud de reserva',
  });
}

interface MatchAcceptedEmailData {
  requesterName: string;
  hostName: string;
  experienceTitle: string;
  experienceCity: string;
  startDate: Date;
  meetingPoint?: string;
  hostPhone?: string;
  totalPrice: number;
  currency?: string;
  matchUrl: string;
  chatUrl: string;
}

export function getMatchAcceptedTemplate(data: MatchAcceptedEmailData): string {
  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 24px;">
      ¡Enhorabuena, ${data.requesterName}!
    </h2>
    <p style="color: #4b5563; margin: 0 0 25px; font-size: 16px; line-height: 1.6;">
      <strong>${data.hostName}</strong> ha aceptado tu solicitud. ¡Preparate para vivir una experiencia increible!
    </p>

    ${getInfoBox(
      `
      <h3 style="margin: 0 0 12px; font-size: 18px;">Detalles de tu reserva</h3>
      <p style="margin: 0 0 8px; font-size: 14px;">
        <strong>Experiencia:</strong> ${data.experienceTitle}
      </p>
      <p style="margin: 0 0 8px; font-size: 14px;">
        <strong>Fecha:</strong> ${formatDate(data.startDate)}
      </p>
      <p style="margin: 0 0 8px; font-size: 14px;">
        <strong>Ubicacion:</strong> ${data.experienceCity}
      </p>
      ${data.meetingPoint ? `<p style="margin: 0 0 8px; font-size: 14px;"><strong>Punto de encuentro:</strong> ${data.meetingPoint}</p>` : ''}
      <p style="margin: 0; font-size: 14px;">
        <strong>Anfitrion:</strong> ${data.hostName}
      </p>
      `,
      'success',
    )}

    ${getButton('Ver reserva', data.matchUrl, 'green')}

    <table role="presentation" style="width: 100%; margin: 20px 0;">
      <tr>
        <td style="text-align: center;">
          <a href="${data.chatUrl}" style="color: #2563eb; text-decoration: none; font-size: 14px;">
            Enviar mensaje a ${data.hostName}
          </a>
        </td>
      </tr>
    </table>

    ${getDivider()}
    <p style="color: #6b7280; margin: 0 0 10px; font-size: 14px; font-weight: 600;">
      Proximos pasos:
    </p>
    <ul style="color: #6b7280; margin: 10px 0 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
      <li>Contacta con ${data.hostName} para confirmar los detalles</li>
      <li>Guarda la fecha en tu calendario</li>
      <li>Prepara lo que necesites para la experiencia</li>
    </ul>
  `;

  return getBaseTemplate(content, {
    title: 'Reserva confirmada',
    preheader: `Tu reserva para ${data.experienceTitle} ha sido confirmada`,
    headerGradient: 'green',
    headerSubtitle: '¡Reserva confirmada!',
  });
}

interface MatchRejectedEmailData {
  requesterName: string;
  hostName: string;
  experienceTitle: string;
  experienceCity: string;
  startDate: Date;
  reason?: string;
  searchUrl: string;
}

export function getMatchRejectedTemplate(data: MatchRejectedEmailData): string {
  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 24px;">
      Hola, ${data.requesterName}
    </h2>
    <p style="color: #4b5563; margin: 0 0 25px; font-size: 16px; line-height: 1.6;">
      Lamentamos informarte que <strong>${data.hostName}</strong> no ha podido aceptar tu solicitud para la experiencia.
    </p>

    ${getInfoBox(
      `
      <p style="margin: 0 0 8px; font-size: 14px;">
        <strong>Experiencia:</strong> ${data.experienceTitle}
      </p>
      <p style="margin: 0 0 8px; font-size: 14px;">
        <strong>Fecha solicitada:</strong> ${formatDate(data.startDate)}
      </p>
      <p style="margin: 0; font-size: 14px;">
        <strong>Ubicacion:</strong> ${data.experienceCity}
      </p>
      ${data.reason ? `<p style="margin: 10px 0 0; font-size: 13px; color: #6b7280;"><strong>Motivo:</strong> ${data.reason}</p>` : ''}
      `,
      'warning',
    )}

    <p style="color: #4b5563; margin: 25px 0; font-size: 16px; line-height: 1.6;">
      No te desanimes, hay muchas otras experiencias increibles esperandote. Explora mas opciones y encuentra tu proxima aventura.
    </p>

    ${getButton('Explorar experiencias', data.searchUrl, 'primary')}
  `;

  return getBaseTemplate(content, {
    title: 'Solicitud no aceptada',
    preheader: `Tu solicitud para ${data.experienceTitle} no fue aceptada`,
    headerGradient: 'primary',
    headerSubtitle: 'Actualización de tu solicitud',
  });
}

interface MatchCancelledEmailData {
  userName: string;
  otherPartyName: string;
  experienceTitle: string;
  experienceCity: string;
  startDate: Date;
  cancelledByHost: boolean;
  reason?: string;
  refundAmount?: number;
  refundPercentage?: number;
  currency?: string;
  walletUrl: string;
  searchUrl: string;
}

export function getMatchCancelledTemplate(
  data: MatchCancelledEmailData,
): string {
  const cancelledBy = data.cancelledByHost ? 'el anfitrion' : 'el viajero';

  const refundInfo =
    data.refundAmount !== undefined && data.refundAmount > 0
      ? getInfoBox(
          `
      <h4 style="margin: 0 0 10px; font-size: 16px;">Informacion del reembolso</h4>
      <p style="margin: 0 0 8px; font-size: 14px;">
        <strong>Porcentaje reembolsado:</strong> ${data.refundPercentage}%
      </p>
      <p style="margin: 0; font-size: 14px;">
        <strong>Monto a recibir:</strong> ${formatCurrency(data.refundAmount, data.currency)}
      </p>
      <p style="margin: 10px 0 0; font-size: 13px; color: #065f46;">
        El reembolso se acreditara en tu wallet en las proximas 24-48 horas.
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
      Te informamos que la siguiente reserva ha sido cancelada por ${cancelledBy}:
    </p>

    ${getInfoBox(
      `
      <p style="margin: 0 0 8px; font-size: 14px;">
        <strong>Experiencia:</strong> ${data.experienceTitle}
      </p>
      <p style="margin: 0 0 8px; font-size: 14px;">
        <strong>Fecha:</strong> ${formatDate(data.startDate)}
      </p>
      <p style="margin: 0; font-size: 14px;">
        <strong>Ubicacion:</strong> ${data.experienceCity}
      </p>
      ${data.reason ? `<p style="margin: 10px 0 0; font-size: 13px;"><strong>Motivo:</strong> ${data.reason}</p>` : ''}
      `,
      'error',
    )}

    ${refundInfo}

    <p style="color: #4b5563; margin: 25px 0; font-size: 16px; line-height: 1.6;">
      Sentimos las molestias ocasionadas. Te invitamos a explorar otras experiencias disponibles.
    </p>

    ${getButton('Explorar experiencias', data.searchUrl, 'primary')}

    ${
      data.refundAmount !== undefined && data.refundAmount > 0
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
  `;

  return getBaseTemplate(content, {
    title: 'Reserva cancelada',
    preheader: `Tu reserva para ${data.experienceTitle} ha sido cancelada`,
    headerGradient: 'red',
    headerSubtitle: 'Reserva cancelada',
  });
}

interface MatchCompletedEmailData {
  userName: string;
  otherPartyName: string;
  experienceTitle: string;
  experienceCity: string;
  startDate: Date;
  isHost: boolean;
  reviewUrl: string;
  earnedAmount?: number;
  currency?: string;
}

export function getMatchCompletedTemplate(
  data: MatchCompletedEmailData,
): string {
  const hostContent = data.earnedAmount
    ? `
    ${getInfoBox(
      `
      <h4 style="margin: 0 0 10px; font-size: 16px;">Resumen de ingresos</h4>
      <p style="margin: 0; font-size: 14px;">
        <strong>Has ganado:</strong> ${formatCurrency(data.earnedAmount, data.currency)}
      </p>
      <p style="margin: 10px 0 0; font-size: 13px; color: #065f46;">
        El pago ya esta disponible en tu wallet.
      </p>
      `,
      'success',
    )}
    `
    : '';

  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 24px;">
      ¡Experiencia completada, ${data.userName}!
    </h2>
    <p style="color: #4b5563; margin: 0 0 25px; font-size: 16px; line-height: 1.6;">
      Esperamos que hayas disfrutado de la experiencia. Tu opinion es muy importante para nosotros y para ${data.otherPartyName}.
    </p>

    ${getInfoBox(
      `
      <p style="margin: 0 0 8px; font-size: 14px;">
        <strong>Experiencia:</strong> ${data.experienceTitle}
      </p>
      <p style="margin: 0 0 8px; font-size: 14px;">
        <strong>Fecha:</strong> ${formatDate(data.startDate)}
      </p>
      <p style="margin: 0; font-size: 14px;">
        <strong>Ubicacion:</strong> ${data.experienceCity}
      </p>
      `,
      'info',
    )}

    ${data.isHost ? hostContent : ''}

    <p style="color: #4b5563; margin: 25px 0; font-size: 16px; line-height: 1.6;">
      ¿Que te ha parecido la experiencia? Deja una resena para ayudar a otros usuarios.
    </p>

    ${getButton('Dejar resena', data.reviewUrl, 'purple')}
  `;

  return getBaseTemplate(content, {
    title: 'Experiencia completada',
    preheader: `¡Tu experiencia ${data.experienceTitle} ha finalizado!`,
    headerGradient: 'green',
    headerSubtitle: '¡Experiencia completada!',
  });
}
