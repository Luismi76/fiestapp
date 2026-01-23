import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PushService } from '../notifications/push.service';

@Injectable()
export class AvailabilityAlertService {
  private readonly logger = new Logger(AvailabilityAlertService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private pushService: PushService,
  ) {}

  /**
   * Cron job que verifica disponibilidad cada hora
   * y notifica a usuarios con alertas activas
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkAvailabilityAlerts() {
    this.logger.log('Verificando alertas de disponibilidad...');

    try {
      // Obtener todas las alertas activas
      const activeAlerts = await this.prisma.favoriteAlert.findMany({
        where: {
          enabled: true,
        },
        include: {
          favorite: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              experience: {
                include: {
                  availability: {
                    where: {
                      date: {
                        gte: new Date(),
                      },
                      available: true,
                    },
                    take: 5,
                    orderBy: {
                      date: 'asc',
                    },
                  },
                  festival: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      let notificationsCount = 0;

      for (const alert of activeAlerts) {
        const { favorite } = alert;
        const { experience, user } = favorite;

        // Si hay fechas disponibles y no hemos notificado recientemente
        if (experience.availability.length > 0) {
          const lastNotified = alert.lastNotified;
          const now = new Date();

          // Solo notificar si han pasado al menos 24 horas desde la ultima notificacion
          if (
            !lastNotified ||
            now.getTime() - lastNotified.getTime() > 24 * 60 * 60 * 1000
          ) {
            // Crear notificacion en BD
            await this.notificationsService.create({
              userId: user.id,
              type: 'system',
              title: 'Nueva disponibilidad',
              message: `"${experience.title}" tiene ${experience.availability.length} nuevas fechas disponibles`,
              data: {
                experienceId: experience.id,
                availableDates: experience.availability.map((a) =>
                  a.date.toISOString(),
                ),
              },
            });

            // Enviar push notification
            await this.pushService.sendToUser(user.id, {
              title: 'Nueva disponibilidad',
              body: `"${experience.title}" tiene nuevas fechas disponibles`,
              data: {
                url: `/experiences/${experience.id}`,
                experienceId: experience.id,
              },
            });

            // Actualizar lastNotified
            await this.prisma.favoriteAlert.update({
              where: { id: alert.id },
              data: { lastNotified: now },
            });

            notificationsCount++;
          }
        }
      }

      this.logger.log(
        `Alertas procesadas: ${activeAlerts.length}, Notificaciones enviadas: ${notificationsCount}`,
      );
    } catch (error) {
      this.logger.error('Error verificando alertas de disponibilidad', error);
    }
  }

  /**
   * Verifica disponibilidad para una experiencia especifica
   * y notifica a los usuarios con alertas activas
   */
  async notifyNewAvailability(experienceId: string, newDates: Date[]) {
    if (newDates.length === 0) return;

    const alerts = await this.prisma.favoriteAlert.findMany({
      where: {
        enabled: true,
        favorite: {
          experienceId,
        },
      },
      include: {
        favorite: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
            experience: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    const notifications = alerts.map((alert) => ({
      userId: alert.favorite.user.id,
      type: 'system' as const,
      title: 'Nueva disponibilidad',
      message: `"${alert.favorite.experience.title}" tiene ${newDates.length} nuevas fechas disponibles`,
      data: {
        experienceId,
        availableDates: newDates.map((d) => d.toISOString()),
      },
    }));

    if (notifications.length > 0) {
      await this.notificationsService.createMany(notifications);

      // Enviar push notifications
      for (const alert of alerts) {
        await this.pushService.sendToUser(alert.favorite.user.id, {
          title: 'Nueva disponibilidad',
          body: `"${alert.favorite.experience.title}" tiene nuevas fechas disponibles`,
          data: {
            url: `/experiences/${experienceId}`,
            experienceId,
          },
        });
      }

      // Actualizar lastNotified para todas las alertas
      const now = new Date();
      await this.prisma.favoriteAlert.updateMany({
        where: {
          id: { in: alerts.map((a) => a.id) },
        },
        data: { lastNotified: now },
      });
    }

    return { notifiedUsers: notifications.length };
  }
}
