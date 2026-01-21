import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateNotificationDto,
  NotificationListResponseDto,
  NotificationPreferencesResponseDto,
  NotificationType,
  UpdateNotificationPreferencesDto,
} from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crea una nueva notificación para un usuario
   */
  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        data: dto.data as Prisma.InputJsonValue | undefined,
      },
    });
  }

  /**
   * Crea múltiples notificaciones (para notificaciones masivas)
   */
  async createMany(notifications: CreateNotificationDto[]) {
    return this.prisma.notification.createMany({
      data: notifications.map((n) => ({
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data as Prisma.InputJsonValue | undefined,
      })),
    });
  }

  /**
   * Obtiene las notificaciones de un usuario (paginado)
   */
  async getByUser(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false,
    type?: NotificationType,
  ): Promise<NotificationListResponseDto> {
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(unreadOnly && { read: false }),
      ...(type && { type }),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, read: false },
      }),
    ]);

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data as Record<string, unknown> | null,
        read: n.read,
        createdAt: n.createdAt,
      })),
      total,
      unreadCount,
      page,
      limit,
      hasMore: skip + notifications.length < total,
    };
  }

  /**
   * Obtiene el conteo de notificaciones no leídas
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, read: false },
    });
  }

  /**
   * Marca una notificación como leída
   */
  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  /**
   * Elimina una notificación
   */
  async delete(notificationId: string, userId: string) {
    return this.prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
  }

  /**
   * Elimina notificaciones antiguas (más de 30 días)
   */
  async deleteOldNotifications() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.prisma.notification.deleteMany({
      where: {
        read: true,
        createdAt: { lt: thirtyDaysAgo },
      },
    });
  }

  // ========== Notification Preferences ==========

  /**
   * Obtiene las preferencias de notificación del usuario
   */
  async getPreferences(userId: string): Promise<NotificationPreferencesResponseDto> {
    let preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    // Si no existen, crear preferencias por defecto
    if (!preferences) {
      preferences = await this.prisma.notificationPreference.create({
        data: { userId },
      });
    }

    return {
      emailNewMatch: preferences.emailNewMatch,
      emailMatchAccepted: preferences.emailMatchAccepted,
      emailMatchRejected: preferences.emailMatchRejected,
      emailNewMessage: preferences.emailNewMessage,
      emailReminders: preferences.emailReminders,
      emailReviewRequest: preferences.emailReviewRequest,
      emailMarketing: preferences.emailMarketing,
      pushNewMatch: preferences.pushNewMatch,
      pushMatchAccepted: preferences.pushMatchAccepted,
      pushNewMessage: preferences.pushNewMessage,
      pushReminders: preferences.pushReminders,
    };
  }

  /**
   * Actualiza las preferencias de notificación
   */
  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesResponseDto> {
    const preferences = await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto },
    });

    return {
      emailNewMatch: preferences.emailNewMatch,
      emailMatchAccepted: preferences.emailMatchAccepted,
      emailMatchRejected: preferences.emailMatchRejected,
      emailNewMessage: preferences.emailNewMessage,
      emailReminders: preferences.emailReminders,
      emailReviewRequest: preferences.emailReviewRequest,
      emailMarketing: preferences.emailMarketing,
      pushNewMatch: preferences.pushNewMatch,
      pushMatchAccepted: preferences.pushMatchAccepted,
      pushNewMessage: preferences.pushNewMessage,
      pushReminders: preferences.pushReminders,
    };
  }

  /**
   * Verifica si el usuario tiene habilitado un tipo de notificación
   */
  async shouldSendEmail(
    userId: string,
    type: 'newMatch' | 'matchAccepted' | 'matchRejected' | 'newMessage' | 'reminders' | 'reviewRequest' | 'marketing',
  ): Promise<boolean> {
    const preferences = await this.getPreferences(userId);

    const mapping: Record<string, keyof NotificationPreferencesResponseDto> = {
      newMatch: 'emailNewMatch',
      matchAccepted: 'emailMatchAccepted',
      matchRejected: 'emailMatchRejected',
      newMessage: 'emailNewMessage',
      reminders: 'emailReminders',
      reviewRequest: 'emailReviewRequest',
      marketing: 'emailMarketing',
    };

    return preferences[mapping[type]] ?? true;
  }

  /**
   * Verifica si el usuario tiene habilitadas las push notifications para un tipo
   */
  async shouldSendPush(
    userId: string,
    type: 'newMatch' | 'matchAccepted' | 'newMessage' | 'reminders',
  ): Promise<boolean> {
    const preferences = await this.getPreferences(userId);

    const mapping: Record<string, keyof NotificationPreferencesResponseDto> = {
      newMatch: 'pushNewMatch',
      matchAccepted: 'pushMatchAccepted',
      newMessage: 'pushNewMessage',
      reminders: 'pushReminders',
    };

    return preferences[mapping[type]] ?? true;
  }

  // ========== Helper methods for specific notifications ==========

  /**
   * Notifica una nueva solicitud de match
   */
  async notifyMatchRequest(
    hostId: string,
    matchId: string,
    requesterName: string,
    experienceTitle: string,
  ) {
    return this.create({
      userId: hostId,
      type: NotificationType.MATCH_REQUEST,
      title: 'Nueva solicitud de match',
      message: `${requesterName} quiere unirse a tu experiencia "${experienceTitle}"`,
      data: { matchId },
    });
  }

  /**
   * Notifica que un match ha sido aceptado
   */
  async notifyMatchAccepted(
    requesterId: string,
    matchId: string,
    hostName: string,
    experienceTitle: string,
  ) {
    return this.create({
      userId: requesterId,
      type: NotificationType.MATCH_ACCEPTED,
      title: 'Match aceptado',
      message: `${hostName} ha aceptado tu solicitud para "${experienceTitle}"`,
      data: { matchId },
    });
  }

  /**
   * Notifica que un match ha sido rechazado
   */
  async notifyMatchRejected(
    requesterId: string,
    matchId: string,
    experienceTitle: string,
  ) {
    return this.create({
      userId: requesterId,
      type: NotificationType.MATCH_REJECTED,
      title: 'Solicitud rechazada',
      message: `Tu solicitud para "${experienceTitle}" no ha sido aceptada`,
      data: { matchId },
    });
  }

  /**
   * Notifica un nuevo mensaje
   */
  async notifyNewMessage(
    receiverId: string,
    matchId: string,
    senderName: string,
  ) {
    return this.create({
      userId: receiverId,
      type: NotificationType.NEW_MESSAGE,
      title: 'Nuevo mensaje',
      message: `${senderName} te ha enviado un mensaje`,
      data: { matchId },
    });
  }

  /**
   * Notifica recordatorio 3 días antes
   */
  async notifyReminder3Days(
    userId: string,
    matchId: string,
    experienceTitle: string,
    date: Date,
  ) {
    return this.create({
      userId,
      type: NotificationType.REMINDER_3_DAYS,
      title: 'Recordatorio: 3 días',
      message: `Tu experiencia "${experienceTitle}" es en 3 días (${date.toLocaleDateString('es-ES')})`,
      data: { matchId },
    });
  }

  /**
   * Notifica recordatorio 1 día antes
   */
  async notifyReminder1Day(
    userId: string,
    matchId: string,
    experienceTitle: string,
    date: Date,
  ) {
    return this.create({
      userId,
      type: NotificationType.REMINDER_1_DAY,
      title: 'Recordatorio: Mañana',
      message: `Tu experiencia "${experienceTitle}" es mañana (${date.toLocaleDateString('es-ES')})`,
      data: { matchId },
    });
  }

  /**
   * Notifica solicitud de reseña
   */
  async notifyReviewRequest(
    userId: string,
    matchId: string,
    experienceTitle: string,
  ) {
    return this.create({
      userId,
      type: NotificationType.REVIEW_REQUEST,
      title: 'Deja tu opinión',
      message: `Cuéntanos tu experiencia en "${experienceTitle}"`,
      data: { matchId },
    });
  }
}
