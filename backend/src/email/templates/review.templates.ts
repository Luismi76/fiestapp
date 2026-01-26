/**
 * Templates de email para solicitudes de reseñas
 */

import {
  getBaseTemplate,
  getButton,
  getInfoBox,
  getDivider,
  formatDate,
} from './base.template';

interface ReviewRequestEmailData {
  userName: string;
  otherPartyName: string;
  isHost: boolean;
  experienceTitle: string;
  experienceCity: string;
  experienceDate: Date;
  reviewUrl: string;
}

export function getReviewRequestTemplate(data: ReviewRequestEmailData): string {
  const roleText = data.isHost
    ? `¿Que tal fue la experiencia con ${data.otherPartyName}?`
    : `¿Que tal fue tu experiencia con ${data.otherPartyName}?`;

  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 24px;">
      Hola, ${data.userName}
    </h2>
    <p style="color: #4b5563; margin: 0 0 25px; font-size: 16px; line-height: 1.6;">
      ${roleText} Tu opinion ayuda a otros usuarios a tomar mejores decisiones.
    </p>

    ${getInfoBox(
      `
      <p style="margin: 0 0 8px; font-size: 14px;">
        <strong>Experiencia:</strong> ${data.experienceTitle}
      </p>
      <p style="margin: 0 0 8px; font-size: 14px;">
        <strong>Ubicacion:</strong> ${data.experienceCity}
      </p>
      <p style="margin: 0; font-size: 14px;">
        <strong>Fecha:</strong> ${formatDate(data.experienceDate)}
      </p>
      `,
      'info',
    )}

    <div style="text-align: center; margin: 30px 0;">
      <p style="color: #6b7280; margin: 0 0 15px; font-size: 14px;">
        ¿Como calificarias tu experiencia?
      </p>
      <div style="font-size: 32px; margin: 0 0 20px;">
        ⭐ ⭐ ⭐ ⭐ ⭐
      </div>
    </div>

    ${getButton('Dejar mi resena', data.reviewUrl, 'purple')}

    ${getDivider()}
    <p style="color: #6b7280; margin: 0 0 10px; font-size: 14px; font-weight: 600;">
      ¿Por que dejar una resena?
    </p>
    <ul style="color: #6b7280; margin: 10px 0 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
      <li>Ayudas a otros viajeros a elegir experiencias</li>
      <li>Reconoces el trabajo de los anfitriones</li>
      <li>Contribuyes a mejorar la comunidad</li>
      <li>¡Solo te llevara 2 minutos!</li>
    </ul>
  `;

  return getBaseTemplate(content, {
    title: 'Cuentanos tu experiencia',
    preheader: `¿Que tal fue ${data.experienceTitle}?`,
    headerGradient: 'purple',
    headerSubtitle: '¿Que tal fue tu experiencia?',
  });
}

interface ReviewReceivedEmailData {
  userName: string;
  reviewerName: string;
  rating: number;
  comment: string;
  experienceTitle: string;
  reviewUrl: string;
  canRespond: boolean;
}

export function getReviewReceivedTemplate(
  data: ReviewReceivedEmailData,
): string {
  const stars = '⭐'.repeat(data.rating) + '☆'.repeat(5 - data.rating);

  const ratingText =
    data.rating >= 4
      ? '¡Excelente trabajo!'
      : data.rating >= 3
        ? 'Buena valoracion'
        : 'Gracias por tu esfuerzo';

  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 24px;">
      Hola, ${data.userName}
    </h2>
    <p style="color: #4b5563; margin: 0 0 25px; font-size: 16px; line-height: 1.6;">
      <strong>${data.reviewerName}</strong> ha dejado una resena sobre tu experiencia.
    </p>

    ${getInfoBox(
      `
      <h4 style="margin: 0 0 8px; font-size: 16px;">${data.experienceTitle}</h4>
      <div style="margin: 15px 0; text-align: center;">
        <div style="font-size: 28px; margin: 0 0 5px;">${stars}</div>
        <span style="color: #6b7280; font-size: 14px;">${data.rating} de 5 - ${ratingText}</span>
      </div>
      ${data.comment ? `<p style="margin: 15px 0 0; font-size: 14px; font-style: italic; color: #4b5563;">"${data.comment.slice(0, 300)}${data.comment.length > 300 ? '...' : ''}"</p>` : ''}
      `,
      data.rating >= 4 ? 'success' : data.rating >= 3 ? 'info' : 'warning',
    )}

    ${getButton('Ver resena completa', data.reviewUrl, data.rating >= 4 ? 'green' : 'primary')}

    ${
      data.canRespond
        ? `
    <table role="presentation" style="width: 100%; margin: 20px 0;">
      <tr>
        <td style="text-align: center;">
          <p style="color: #6b7280; margin: 0 0 10px; font-size: 14px;">
            ¿Quieres responder a esta resena?
          </p>
          <a href="${data.reviewUrl}#respond" style="color: #2563eb; text-decoration: none; font-size: 14px;">
            Responder a ${data.reviewerName}
          </a>
        </td>
      </tr>
    </table>
    `
        : ''
    }

    ${getDivider()}
    <p style="color: #9ca3af; margin: 0; font-size: 13px;">
      Las resenas ayudan a construir tu reputacion en FiestApp. Sigue ofreciendo experiencias increibles.
    </p>
  `;

  return getBaseTemplate(content, {
    title: 'Nueva resena recibida',
    preheader: `${data.reviewerName} te ha valorado con ${data.rating} estrellas`,
    headerGradient: data.rating >= 4 ? 'green' : 'primary',
    headerSubtitle: 'Nueva resena',
  });
}
