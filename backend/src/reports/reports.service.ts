import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { CreateReportDto } from './dto/create-report.dto';

// Templates de respuesta para admins
export const RESPONSE_TEMPLATES = {
  resolved_warning: {
    title: 'Tu reporte ha sido resuelto',
    message:
      'Hemos revisado tu reporte y hemos tomado las medidas necesarias. El usuario ha recibido una advertencia.',
  },
  resolved_strike: {
    title: 'Tu reporte ha sido resuelto',
    message:
      'Hemos revisado tu reporte y hemos tomado las medidas necesarias. El usuario ha recibido un strike.',
  },
  resolved_ban: {
    title: 'Tu reporte ha sido resuelto',
    message:
      'Hemos revisado tu reporte y hemos tomado medidas contundentes. El usuario ha sido suspendido de la plataforma.',
  },
  resolved_content_removed: {
    title: 'Tu reporte ha sido resuelto',
    message:
      'Hemos revisado tu reporte y el contenido inapropiado ha sido eliminado.',
  },
  dismissed_no_violation: {
    title: 'Reporte revisado',
    message:
      'Hemos revisado tu reporte pero no hemos encontrado una violacion de nuestras normas de comunidad.',
  },
  dismissed_insufficient_evidence: {
    title: 'Reporte revisado',
    message:
      'Hemos revisado tu reporte pero no hemos podido verificar la infraccion con la informacion proporcionada.',
  },
};

export type ResponseTemplateKey = keyof typeof RESPONSE_TEMPLATES;

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private auditService: AuditService,
  ) {}

  async create(userId: string, createReportDto: CreateReportDto) {
    const { reportedType, reportedId, reason, description } = createReportDto;

    // Validate the reported entity exists
    if (reportedType === 'user') {
      const user = await this.prisma.user.findUnique({
        where: { id: reportedId },
      });
      if (!user) throw new NotFoundException('Usuario no encontrado');
      if (user.id === userId)
        throw new BadRequestException('No puedes reportarte a ti mismo');
    } else if (reportedType === 'experience') {
      const exp = await this.prisma.experience.findUnique({
        where: { id: reportedId },
      });
      if (!exp) throw new NotFoundException('Experiencia no encontrada');
    } else if (reportedType === 'match') {
      const match = await this.prisma.match.findFirst({
        where: {
          id: reportedId,
          OR: [{ hostId: userId }, { requesterId: userId }],
        },
      });
      if (!match)
        throw new NotFoundException('Match no encontrado o no tienes acceso');
    }

    // Check for duplicate reports
    const existingReport = await this.prisma.report.findFirst({
      where: {
        reporterId: userId,
        reportedType,
        reportedId,
        status: { in: ['pending', 'reviewed'] },
      },
    });

    if (existingReport) {
      throw new BadRequestException('Ya has reportado este elemento');
    }

    return this.prisma.report.create({
      data: {
        reporterId: userId,
        reportedType,
        reportedId,
        reason,
        description,
      },
    });
  }

  // User's own reports
  async getMyReports(userId: string) {
    return this.prisma.report.findMany({
      where: { reporterId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Admin methods
  async getAllReports(
    page = 1,
    limit = 20,
    status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed',
  ) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    // Enrich with reported entity info
    const enrichedReports = await Promise.all(
      reports.map(async (report) => {
        let reportedEntity: unknown = null;

        if (report.reportedType === 'user') {
          reportedEntity = await this.prisma.user.findUnique({
            where: { id: report.reportedId },
            select: { id: true, name: true, email: true },
          });
        } else if (report.reportedType === 'experience') {
          reportedEntity = await this.prisma.experience.findUnique({
            where: { id: report.reportedId },
            select: { id: true, title: true, city: true },
          });
        } else if (report.reportedType === 'match') {
          reportedEntity = await this.prisma.match.findUnique({
            where: { id: report.reportedId },
            select: {
              id: true,
              status: true,
              experience: { select: { title: true } },
            },
          });
        }

        return { ...report, reportedEntity };
      }),
    );

    return {
      reports: enrichedReports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateStatus(
    reportId: string,
    status: 'reviewed' | 'resolved' | 'dismissed',
    adminNotes?: string,
  ) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) throw new NotFoundException('Reporte no encontrado');

    return this.prisma.report.update({
      where: { id: reportId },
      data: {
        status,
        adminNotes,
        resolvedAt: ['resolved', 'dismissed'].includes(status)
          ? new Date()
          : null,
      },
    });
  }

  async getStats() {
    const [pending, reviewed, resolved, dismissed, total] = await Promise.all([
      this.prisma.report.count({ where: { status: 'pending' } }),
      this.prisma.report.count({ where: { status: 'reviewed' } }),
      this.prisma.report.count({ where: { status: 'resolved' } }),
      this.prisma.report.count({ where: { status: 'dismissed' } }),
      this.prisma.report.count(),
    ]);

    return { pending, reviewed, resolved, dismissed, total };
  }

  // ============================================
  // Gestion de Reportes Mejorada
  // ============================================

  /**
   * Obtiene reportes con filtros avanzados
   */
  async getReportsAdvanced(
    page = 1,
    limit = 20,
    filters: {
      status?: string;
      reportedType?: string;
      reason?: string;
      dateFrom?: Date;
      dateTo?: Date;
      priority?: 'low' | 'medium' | 'high';
    } = {},
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.ReportWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.reportedType) {
      where.reportedType = filters.reportedType;
    }
    if (filters.reason) {
      where.reason = filters.reason;
    }
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom)
        (where.createdAt as Prisma.DateTimeFilter).gte = filters.dateFrom;
      if (filters.dateTo)
        (where.createdAt as Prisma.DateTimeFilter).lte = filters.dateTo;
    }

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    // Enrich con info del reportado

    const enrichedReports = await Promise.all(
      reports.map(async (report) => {
        let reportedEntity: any = null;

        if (report.reportedType === 'user') {
          reportedEntity = await this.prisma.user.findUnique({
            where: { id: report.reportedId },
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              strikes: true,
              bannedAt: true,
            },
          });
        } else if (report.reportedType === 'experience') {
          reportedEntity = await this.prisma.experience.findUnique({
            where: { id: report.reportedId },
            select: {
              id: true,
              title: true,
              city: true,
              published: true,
              host: { select: { id: true, name: true } },
            },
          });
        } else if (report.reportedType === 'match') {
          reportedEntity = await this.prisma.match.findUnique({
            where: { id: report.reportedId },
            select: {
              id: true,
              status: true,
              experience: { select: { title: true } },
              host: { select: { id: true, name: true } },
              requester: { select: { id: true, name: true } },
            },
          });
        }

        // Determinar prioridad basada en factores
        const priority = this.calculatePriority(report, reportedEntity);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        return { ...report, reportedEntity, priority };
      }),
    );

    // Ordenar por prioridad si se solicita
    if (filters.priority) {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      enrichedReports.sort((a, b) => {
        if (a.priority === filters.priority && b.priority !== filters.priority)
          return -1;
        if (b.priority === filters.priority && a.priority !== filters.priority)
          return 1;
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
    }

    return {
      reports: enrichedReports,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Calcula la prioridad de un reporte
   */
  private calculatePriority(
    report: { reason: string },

    reportedEntity: any,
  ): 'low' | 'medium' | 'high' {
    // Alta prioridad: fraude, acoso, usuario con strikes
    if (['fraud', 'harassment'].includes(report.reason)) return 'high';
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (reportedEntity?.strikes >= 2) return 'high';

    // Media prioridad: contenido inapropiado, spam
    if (['inappropriate', 'spam'].includes(report.reason)) return 'medium';
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (reportedEntity?.strikes >= 1) return 'medium';

    return 'low';
  }

  /**
   * Obtiene detalle completo de un reporte con contexto
   */
  async getReportDetail(reportId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            createdAt: true,
            _count: { select: { reports: true } },
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Reporte no encontrado');
    }

    let reportedEntity: Record<string, any> | null = null;

    const context: Record<string, any> = {};

    if (report.reportedType === 'user') {
      reportedEntity = await this.prisma.user.findUnique({
        where: { id: report.reportedId },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          bio: true,
          city: true,
          verified: true,
          strikes: true,
          bannedAt: true,
          banReason: true,
          createdAt: true,
          _count: {
            select: {
              experiences: true,
              matchesAsHost: true,
              matchesAsRequester: true,
              reports: true,
            },
          },
        },
      });

      // Contexto: reportes previos contra este usuario
      context.previousReports = await this.prisma.report.count({
        where: {
          reportedType: 'user',
          reportedId: report.reportedId,
          status: 'resolved',
        },
      });
    } else if (report.reportedType === 'experience') {
      reportedEntity = await this.prisma.experience.findUnique({
        where: { id: report.reportedId },
        select: {
          id: true,
          title: true,
          description: true,
          city: true,
          photos: true,
          published: true,
          createdAt: true,
          host: {
            select: {
              id: true,
              name: true,
              email: true,
              strikes: true,
            },
          },
        },
      });
    } else if (report.reportedType === 'match') {
      reportedEntity = await this.prisma.match.findUnique({
        where: { id: report.reportedId },
        select: {
          id: true,
          status: true,
          createdAt: true,
          experience: { select: { id: true, title: true } },
          host: { select: { id: true, name: true, email: true } },
          requester: { select: { id: true, name: true, email: true } },
        },
      });

      // Contexto: mensajes del match
      context.messages = await this.prisma.message.findMany({
        where: { matchId: report.reportedId },
        select: {
          id: true,
          content: true,
          createdAt: true,
          sender: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 50, // Ultimos 50 mensajes
      });
    }

    return {
      ...report,

      reportedEntity,

      context,
      templates: RESPONSE_TEMPLATES,
    };
  }

  /**
   * Resuelve un reporte con accion y notificacion
   */
  async resolveReport(
    reportId: string,
    adminId: string,
    resolution: {
      status: 'resolved' | 'dismissed';
      action?: 'none' | 'warning' | 'strike' | 'ban' | 'remove_content';
      templateKey?: ResponseTemplateKey;
      customMessage?: string;
      adminNotes?: string;
    },
  ) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: { reporter: { select: { id: true, name: true } } },
    });

    if (!report) {
      throw new NotFoundException('Reporte no encontrado');
    }

    // Aplicar accion si es necesario
    if (
      resolution.action &&
      resolution.action !== 'none' &&
      report.reportedType === 'user'
    ) {
      await this.applyAction(
        report.reportedId,
        resolution.action,
        adminId,
        reportId,
      );
    }

    // Actualizar reporte
    const updatedReport = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: resolution.status,
        adminNotes: resolution.adminNotes,
        resolvedAt: new Date(),
      },
    });

    // Notificar al reportador
    const template = resolution.templateKey
      ? RESPONSE_TEMPLATES[resolution.templateKey]
      : null;

    await this.notificationsService.create({
      userId: report.reporterId,
      type: 'system',
      title: template?.title || 'Tu reporte ha sido revisado',
      message:
        resolution.customMessage ||
        template?.message ||
        'Gracias por tu reporte. Ha sido revisado por nuestro equipo.',
      data: { reportId, status: resolution.status },
    });

    // Log de auditoria
    await this.auditService.log({
      userId: adminId,
      action: `report_${resolution.status}`,
      entity: 'report',
      entityId: reportId,
      data: {
        reportedType: report.reportedType,
        reportedId: report.reportedId,
        action: resolution.action,
        adminNotes: resolution.adminNotes,
      },
    });

    return updatedReport;
  }

  /**
   * Aplica una accion sobre el usuario reportado
   */
  private async applyAction(
    userId: string,
    action: 'warning' | 'strike' | 'ban' | 'remove_content',
    adminId: string,
    reportId: string,
  ) {
    if (action === 'warning') {
      // Solo notificar
      await this.notificationsService.create({
        userId,
        type: 'system',
        title: 'Advertencia de la comunidad',
        message:
          'Has recibido una advertencia por comportamiento inapropiado. Por favor, revisa las normas de la comunidad.',
        data: { reason: 'report', reportId },
      });
    } else if (action === 'strike') {
      // Añadir strike
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { strikes: true },
      });

      if (user) {
        const newStrikes = user.strikes + 1;
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            strikes: newStrikes,
            ...(newStrikes >= 3 && {
              bannedAt: new Date(),
              banReason: 'Ban automatico por 3 strikes',
            }),
          },
        });

        await this.notificationsService.create({
          userId,
          type: 'system',
          title:
            newStrikes >= 3 ? 'Cuenta suspendida' : 'Has recibido un strike',
          message:
            newStrikes >= 3
              ? 'Tu cuenta ha sido suspendida por acumular 3 strikes.'
              : `Has recibido un strike (${newStrikes}/3) debido a un reporte de la comunidad.`,
          data: { strikes: newStrikes },
        });
      }
    } else if (action === 'ban') {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          bannedAt: new Date(),
          banReason: 'Suspension por reporte de la comunidad',
        },
      });

      await this.notificationsService.create({
        userId,
        type: 'system',
        title: 'Cuenta suspendida',
        message:
          'Tu cuenta ha sido suspendida debido a un reporte de la comunidad.',
      });
    }

    // Log de auditoria de la accion
    await this.auditService.log({
      userId: adminId,
      action: `admin_${action}_user`,
      entity: 'user',
      entityId: userId,
      data: { reportId, action },
    });
  }

  /**
   * Obtiene templates de respuesta disponibles
   */
  getResponseTemplates() {
    return RESPONSE_TEMPLATES;
  }

  /**
   * Obtiene estadisticas avanzadas de reportes
   */
  async getAdvancedStats(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [byStatus, byType, byReason, resolutionTime, recentTrends] =
      await Promise.all([
        // Por estado
        this.prisma.report.groupBy({
          by: ['status'],
          _count: { status: true },
        }),
        // Por tipo de entidad
        this.prisma.report.groupBy({
          by: ['reportedType'],
          _count: { reportedType: true },
        }),
        // Por razon
        this.prisma.report.groupBy({
          by: ['reason'],
          _count: { reason: true },
        }),
        // Tiempo promedio de resolucion
        this.prisma.report.findMany({
          where: {
            resolvedAt: { not: null },
            createdAt: { gte: startDate },
          },
          select: { createdAt: true, resolvedAt: true },
        }),
        // Tendencia diaria
        this.prisma.report.findMany({
          where: { createdAt: { gte: startDate } },
          select: { createdAt: true },
        }),
      ]);

    // Calcular tiempo promedio de resolucion en horas
    let avgResolutionHours = 0;
    if (resolutionTime.length > 0) {
      const totalHours = resolutionTime.reduce((sum, r) => {
        const diff = r.resolvedAt!.getTime() - r.createdAt.getTime();
        return sum + diff / (1000 * 60 * 60);
      }, 0);
      avgResolutionHours = Math.round(totalHours / resolutionTime.length);
    }

    // Agrupar por dia
    const dailyTrends = new Map<string, number>();
    recentTrends.forEach((r) => {
      const day = r.createdAt.toISOString().split('T')[0];
      dailyTrends.set(day, (dailyTrends.get(day) || 0) + 1);
    });

    return {
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count.status,
      })),
      byType: byType.map((t) => ({
        type: t.reportedType,
        count: t._count.reportedType,
      })),
      byReason: byReason.map((r) => ({
        reason: r.reason,
        count: r._count.reason,
      })),
      avgResolutionHours,
      dailyTrends: Array.from(dailyTrends.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }
}
