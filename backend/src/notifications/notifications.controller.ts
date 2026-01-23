import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  Headers,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import {
  GetNotificationsQueryDto,
  UpdateNotificationPreferencesDto,
  NotificationType,
} from './dto/notification.dto';
import { SubscribePushDto, UnsubscribePushDto } from './dto/push.dto';

interface AuthenticatedRequest extends ExpressRequest {
  user: AuthenticatedUser;
}

@Controller('notifications')
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private pushService: PushService,
  ) {}

  // ========== Push Notifications ==========

  /**
   * Obtiene la clave pública VAPID para suscribirse a push
   * (No requiere autenticación)
   */
  @Get('push/public-key')
  async getPushPublicKey() {
    return {
      enabled: this.pushService.isEnabled(),
      publicKey: this.pushService.getPublicKey(),
    };
  }

  /**
   * Suscribe al usuario a notificaciones push
   */
  @Post('push/subscribe')
  @UseGuards(JwtAuthGuard)
  async subscribePush(
    @Request() req: AuthenticatedRequest,
    @Body() dto: SubscribePushDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    await this.pushService.subscribe(
      req.user.userId,
      { endpoint: dto.endpoint, keys: dto.keys },
      userAgent,
    );
    return { message: 'Suscripción push registrada' };
  }

  /**
   * Cancela una suscripción push
   */
  @Post('push/unsubscribe')
  @UseGuards(JwtAuthGuard)
  async unsubscribePush(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UnsubscribePushDto,
  ) {
    await this.pushService.unsubscribe(req.user.userId, dto.endpoint);
    return { message: 'Suscripción push eliminada' };
  }

  // ========== Notifications ==========

  /**
   * Obtiene las notificaciones del usuario autenticado
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getNotifications(
    @Request() req: AuthenticatedRequest,
    @Query() query: GetNotificationsQueryDto,
  ) {
    return this.notificationsService.getByUser(
      req.user.userId,
      query.page || 1,
      query.limit || 20,
      query.unreadOnly || false,
      query.type as NotificationType,
    );
  }

  /**
   * Obtiene el conteo de notificaciones no leídas
   */
  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  async getUnreadCount(@Request() req: AuthenticatedRequest) {
    const count = await this.notificationsService.getUnreadCount(
      req.user.userId,
    );
    return { unreadCount: count };
  }

  /**
   * Marca una notificación como leída
   */
  @Put(':id/read')
  @UseGuards(JwtAuthGuard)
  async markAsRead(
    @Request() req: AuthenticatedRequest,
    @Param('id') notificationId: string,
  ) {
    await this.notificationsService.markAsRead(notificationId, req.user.userId);
    return { message: 'Notificación marcada como leída' };
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  @Put('read-all')
  @UseGuards(JwtAuthGuard)
  async markAllAsRead(@Request() req: AuthenticatedRequest) {
    await this.notificationsService.markAllAsRead(req.user.userId);
    return { message: 'Todas las notificaciones marcadas como leídas' };
  }

  /**
   * Elimina una notificación
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteNotification(
    @Request() req: AuthenticatedRequest,
    @Param('id') notificationId: string,
  ) {
    await this.notificationsService.delete(notificationId, req.user.userId);
    return { message: 'Notificación eliminada' };
  }

  /**
   * Obtiene las preferencias de notificación
   */
  @Get('preferences')
  @UseGuards(JwtAuthGuard)
  async getPreferences(@Request() req: AuthenticatedRequest) {
    return this.notificationsService.getPreferences(req.user.userId);
  }

  /**
   * Actualiza las preferencias de notificación
   */
  @Put('preferences')
  @UseGuards(JwtAuthGuard)
  async updatePreferences(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(req.user.userId, dto);
  }
}
