import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAuditLogDto {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  data?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Registra una entrada en el log de auditoria
   */
  async log(dto: CreateAuditLogDto) {
    return this.prisma.auditLog.create({
      data: {
        userId: dto.userId,
        action: dto.action,
        entity: dto.entity,
        entityId: dto.entityId,
        data: dto.data as Prisma.InputJsonValue | undefined,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
      },
    });
  }

  /**
   * Registra multiples entradas (bulk)
   */
  async logMany(dtos: CreateAuditLogDto[]) {
    return this.prisma.auditLog.createMany({
      data: dtos.map((dto) => ({
        userId: dto.userId,
        action: dto.action,
        entity: dto.entity,
        entityId: dto.entityId,
        data: dto.data as Prisma.InputJsonValue | undefined,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
      })),
    });
  }

  /**
   * Obtiene logs de auditoria con filtros y paginacion
   */
  async getLogs(page = 1, limit = 50, filters?: AuditLogFilters) {
    const skip = (page - 1) * limit;
    const where: Prisma.AuditLogWhereInput = {};

    if (filters?.userId) {
      where.userId = filters.userId;
    }
    if (filters?.action) {
      where.action = filters.action;
    }
    if (filters?.entity) {
      where.entity = filters.entity;
    }
    if (filters?.entityId) {
      where.entityId = filters.entityId;
    }
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom)
        (where.createdAt as Prisma.DateTimeFilter).gte = filters.dateFrom;
      if (filters.dateTo)
        (where.createdAt as Prisma.DateTimeFilter).lte = filters.dateTo;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtiene logs de un usuario especifico
   */
  async getUserLogs(userId: string, page = 1, limit = 50) {
    return this.getLogs(page, limit, { userId });
  }

  /**
   * Obtiene logs de una entidad especifica
   */
  async getEntityLogs(entity: string, entityId: string, page = 1, limit = 50) {
    return this.getLogs(page, limit, { entity, entityId });
  }

  /**
   * Obtiene tipos de acciones disponibles
   */
  async getActionTypes() {
    const actions = await this.prisma.auditLog.findMany({
      select: { action: true },
      distinct: ['action'],
    });
    return actions.map((a) => a.action);
  }

  /**
   * Obtiene tipos de entidades disponibles
   */
  async getEntityTypes() {
    const entities = await this.prisma.auditLog.findMany({
      select: { entity: true },
      distinct: ['entity'],
    });
    return entities.map((e) => e.entity);
  }

  /**
   * Elimina logs antiguos (mas de X dias)
   */
  async deleteOldLogs(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    return { deletedCount: result.count };
  }

  /**
   * Estadisticas de auditoria
   */
  async getStats(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalLogs, logsByAction, logsByEntity, recentActivity] =
      await Promise.all([
        this.prisma.auditLog.count({
          where: { createdAt: { gte: startDate } },
        }),
        this.prisma.auditLog.groupBy({
          by: ['action'],
          where: { createdAt: { gte: startDate } },
          _count: { action: true },
          orderBy: { _count: { action: 'desc' } },
          take: 10,
        }),
        this.prisma.auditLog.groupBy({
          by: ['entity'],
          where: { createdAt: { gte: startDate } },
          _count: { entity: true },
          orderBy: { _count: { entity: 'desc' } },
          take: 10,
        }),
        this.prisma.auditLog.findMany({
          where: { createdAt: { gte: startDate } },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            user: { select: { name: true, email: true } },
          },
        }),
      ]);

    return {
      totalLogs,
      period: `${days} dias`,
      byAction: logsByAction.map((a) => ({
        action: a.action,
        count: a._count.action,
      })),
      byEntity: logsByEntity.map((e) => ({
        entity: e.entity,
        count: e._count.entity,
      })),
      recentActivity,
    };
  }

  // ============================================
  // Metodos de conveniencia para acciones comunes
  // ============================================

  async logLogin(userId: string, ipAddress?: string, userAgent?: string) {
    return this.log({
      userId,
      action: 'login',
      entity: 'user',
      entityId: userId,
      ipAddress,
      userAgent,
    });
  }

  async logLogout(userId: string, ipAddress?: string) {
    return this.log({
      userId,
      action: 'logout',
      entity: 'user',
      entityId: userId,
      ipAddress,
    });
  }

  async logProfileUpdate(
    userId: string,
    changes: Record<string, unknown>,
    ipAddress?: string,
  ) {
    return this.log({
      userId,
      action: 'update_profile',
      entity: 'user',
      entityId: userId,
      data: { changes },
      ipAddress,
    });
  }

  async logTransaction(
    userId: string,
    transactionId: string,
    type: string,
    amount: number,
    ipAddress?: string,
  ) {
    return this.log({
      userId,
      action: `transaction_${type}`,
      entity: 'transaction',
      entityId: transactionId,
      data: { type, amount },
      ipAddress,
    });
  }

  async logAdminAction(
    adminId: string,
    action: string,
    entity: string,
    entityId: string,
    details?: Record<string, unknown>,
    ipAddress?: string,
  ) {
    return this.log({
      userId: adminId,
      action: `admin_${action}`,
      entity,
      entityId,
      data: details,
      ipAddress,
    });
  }

  async logSecurityEvent(
    userId: string | undefined,
    event: string,
    details?: Record<string, unknown>,
    ipAddress?: string,
  ) {
    return this.log({
      userId,
      action: `security_${event}`,
      entity: 'security',
      data: details,
      ipAddress,
    });
  }
}
