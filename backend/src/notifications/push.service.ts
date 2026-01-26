import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string }>;
}

interface SubscriptionKeys {
  p256dh: string;
  auth: string;
}

interface PushSubscriptionData {
  endpoint: string;
  keys: SubscriptionKeys;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly enabled: boolean;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
  ) {
    const vapidPublicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const vapidEmail =
      this.configService.get<string>('VAPID_EMAIL') ||
      'mailto:info@fiestapp.es';

    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
      this.enabled = true;
      this.logger.log('Web Push configurado correctamente');
    } else {
      this.enabled = false;
      this.logger.warn('Web Push no configurado: faltan VAPID keys');
    }
  }

  /**
   * Verifica si el servicio de push está habilitado
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Obtiene la clave pública VAPID para el frontend
   */
  getPublicKey(): string | null {
    return this.configService.get<string>('VAPID_PUBLIC_KEY') || null;
  }

  /**
   * Registra una nueva suscripción push para un usuario
   */
  async subscribe(
    userId: string,
    subscription: PushSubscriptionData,
    userAgent?: string,
  ) {
    // Verificar si ya existe la suscripción
    const existing = await this.prisma.pushSubscription.findUnique({
      where: { endpoint: subscription.endpoint },
    });

    if (existing) {
      // Actualizar si pertenece al mismo usuario
      if (existing.userId === userId) {
        return this.prisma.pushSubscription.update({
          where: { id: existing.id },
          data: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
            userAgent,
          },
        });
      }
      // Si pertenece a otro usuario, eliminar y crear nueva
      await this.prisma.pushSubscription.delete({
        where: { id: existing.id },
      });
    }

    return this.prisma.pushSubscription.create({
      data: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent,
      },
    });
  }

  /**
   * Elimina una suscripción push
   */
  async unsubscribe(userId: string, endpoint: string) {
    return this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
  }

  /**
   * Elimina todas las suscripciones de un usuario
   */
  async unsubscribeAll(userId: string) {
    return this.prisma.pushSubscription.deleteMany({
      where: { userId },
    });
  }

  /**
   * Envía una notificación push a un usuario específico
   */
  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!this.enabled) {
      this.logger.warn('Push deshabilitado, notificación no enviada');
      return;
    }

    // Verificar preferencias del usuario (futuro: usar para filtrar notificaciones)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _preferences = await this.notificationsService.getPreferences(userId);

    // Obtener todas las suscripciones del usuario
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      this.logger.debug(`Usuario ${userId} no tiene suscripciones push`);
      return;
    }

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/badge-72x72.png',
      data: payload.data,
      actions: payload.actions,
    });

    // Enviar a todas las suscripciones
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          pushPayload,
        );
        this.logger.debug(`Push enviado a ${sub.endpoint.substring(0, 50)}...`);
      } catch (error: unknown) {
        const err = error as { statusCode?: number };
        // Si la suscripción ya no es válida (410 Gone), eliminarla
        if (err.statusCode === 410 || err.statusCode === 404) {
          this.logger.debug(`Eliminando suscripción inválida: ${sub.id}`);
          await this.prisma.pushSubscription.delete({
            where: { id: sub.id },
          });
        } else {
          this.logger.error(`Error enviando push: ${String(error)}`);
        }
      }
    });

    await Promise.all(sendPromises);
  }

  /**
   * Envía notificación push de nueva solicitud de match
   */
  async pushMatchRequest(
    hostId: string,
    requesterName: string,
    experienceTitle: string,
    matchId: string,
  ): Promise<void> {
    const shouldSend = await this.notificationsService.shouldSendPush(
      hostId,
      'newMatch',
    );
    if (!shouldSend) return;

    await this.sendToUser(hostId, {
      title: 'Nueva solicitud',
      body: `${requesterName} quiere unirse a "${experienceTitle}"`,
      data: {
        type: 'match_request',
        matchId,
        url: `/matches/${matchId}`,
      },
      actions: [{ action: 'view', title: 'Ver solicitud' }],
    });
  }

  /**
   * Envía notificación push de match aceptado
   */
  async pushMatchAccepted(
    requesterId: string,
    hostName: string,
    experienceTitle: string,
    matchId: string,
  ): Promise<void> {
    const shouldSend = await this.notificationsService.shouldSendPush(
      requesterId,
      'matchAccepted',
    );
    if (!shouldSend) return;

    await this.sendToUser(requesterId, {
      title: 'Match aceptado',
      body: `${hostName} ha aceptado tu solicitud para "${experienceTitle}"`,
      data: {
        type: 'match_accepted',
        matchId,
        url: `/matches/${matchId}`,
      },
      actions: [
        { action: 'view', title: 'Ver detalles' },
        { action: 'chat', title: 'Ir al chat' },
      ],
    });
  }

  /**
   * Envía notificación push de nuevo mensaje
   */
  async pushNewMessage(
    receiverId: string,
    senderName: string,
    messagePreview: string,
    matchId: string,
  ): Promise<void> {
    const shouldSend = await this.notificationsService.shouldSendPush(
      receiverId,
      'newMessage',
    );
    if (!shouldSend) return;

    await this.sendToUser(receiverId, {
      title: senderName,
      body:
        messagePreview.length > 100
          ? messagePreview.substring(0, 100) + '...'
          : messagePreview,
      data: {
        type: 'new_message',
        matchId,
        url: `/matches/${matchId}`,
      },
      actions: [{ action: 'reply', title: 'Responder' }],
    });
  }

  /**
   * Envía notificación push de recordatorio
   */
  async pushReminder(
    userId: string,
    experienceTitle: string,
    daysUntil: number,
    matchId: string,
  ): Promise<void> {
    const shouldSend = await this.notificationsService.shouldSendPush(
      userId,
      'reminders',
    );
    if (!shouldSend) return;

    const timeText = daysUntil === 1 ? 'mañana' : `en ${daysUntil} días`;

    await this.sendToUser(userId, {
      title: 'Recordatorio',
      body: `"${experienceTitle}" es ${timeText}`,
      data: {
        type: 'reminder',
        matchId,
        url: `/matches/${matchId}`,
      },
    });
  }

  /**
   * Envía notificación push de cargo por acuerdo
   */
  async pushWalletCharged(
    userId: string,
    amount: number,
    experienceTitle: string,
    matchId: string,
    newBalance: number,
  ): Promise<void> {
    await this.sendToUser(userId, {
      title: 'Acuerdo cerrado',
      body: `-${amount.toFixed(2)}€ por "${experienceTitle}". Saldo: ${newBalance.toFixed(2)}€`,
      data: {
        type: 'wallet_charged',
        matchId,
        amount,
        newBalance,
        url: `/wallet`,
      },
      actions: [{ action: 'view', title: 'Ver monedero' }],
    });
  }

  /**
   * Envía notificación push de saldo bajo
   */
  async pushLowBalance(
    userId: string,
    currentBalance: number,
    operationsLeft: number,
  ): Promise<void> {
    const body =
      operationsLeft === 0
        ? `Saldo: ${currentBalance.toFixed(2)}€. Recarga para poder operar.`
        : `Saldo: ${currentBalance.toFixed(2)}€ (${operationsLeft} operación${operationsLeft > 1 ? 'es' : ''} restante${operationsLeft > 1 ? 's' : ''})`;

    await this.sendToUser(userId, {
      title: 'Saldo bajo',
      body,
      data: {
        type: 'wallet_low_balance',
        currentBalance,
        operationsLeft,
        url: `/wallet`,
      },
      actions: [{ action: 'topup', title: 'Recargar' }],
    });
  }
}
