import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateDisputeDto,
  AddDisputeMessageDto,
  ResolveDisputeDto,
} from './dto/create-dispute.dto';
import { DisputeStatus, DisputeReason, Prisma } from '@prisma/client';

const MAX_DISPUTES_PER_MATCH = 3;
const STALE_DISPUTE_DAYS = 30;

export interface DisputeFilters {
  status?: string;
  reason?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class DisputesService {
  private readonly logger = new Logger(DisputesService.name);

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
    private auditService: AuditService,
  ) {}

  /**
   * Obtener descripción legible del motivo de disputa
   */
  getReasonDescription(reason: DisputeReason): string {
    const descriptions: Record<DisputeReason, string> = {
      NO_SHOW: 'El anfitrión/viajero no se presentó',
      EXPERIENCE_MISMATCH: 'La experiencia no coincidió con lo descrito',
      SAFETY_CONCERN: 'Preocupación de seguridad',
      PAYMENT_ISSUE: 'Problema con el pago',
      COMMUNICATION: 'Problema de comunicación',
      OTHER: 'Otro motivo',
    };
    return descriptions[reason] || reason;
  }

  /**
   * Abrir una nueva disputa
   */
  async openDispute(userId: string, dto: CreateDisputeDto) {
    // Verificar que el match existe y el usuario es parte de él
    const match = await this.prisma.match.findUnique({
      where: { id: dto.matchId },
      include: {
        experience: { select: { title: true, city: true } },
        host: { select: { id: true, name: true, email: true } },
        requester: { select: { id: true, name: true, email: true } },
      },
    });

    if (!match) {
      throw new NotFoundException('Reserva no encontrada');
    }

    const isHost = match.hostId === userId;
    const isRequester = match.requesterId === userId;

    if (!isHost && !isRequester) {
      throw new ForbiddenException('No tienes acceso a esta reserva');
    }

    // Solo se pueden abrir disputas en matches aceptados o completados
    if (!['accepted', 'completed'].includes(match.status)) {
      throw new BadRequestException(
        'Solo puedes abrir disputas en reservas aceptadas o completadas',
      );
    }

    // Verificar si ya hay una disputa abierta para este match
    const existingDispute = await this.prisma.dispute.findFirst({
      where: {
        matchId: dto.matchId,
        status: { in: ['OPEN', 'UNDER_REVIEW'] },
      },
    });

    if (existingDispute) {
      throw new BadRequestException(
        'Ya existe una disputa abierta para esta reserva',
      );
    }

    // Verificar límite de disputas por match
    const totalDisputes = await this.prisma.dispute.count({
      where: { matchId: dto.matchId },
    });

    if (totalDisputes >= MAX_DISPUTES_PER_MATCH) {
      throw new BadRequestException(
        `Se ha alcanzado el límite de ${MAX_DISPUTES_PER_MATCH} disputas para esta reserva. Contacta con soporte.`,
      );
    }

    // Determinar quién es el respondent
    const respondentId = isHost ? match.requesterId : match.hostId;

    // Crear la disputa
    const dispute = await this.prisma.dispute.create({
      data: {
        matchId: dto.matchId,
        openedById: userId,
        respondentId,
        reason: dto.reason,
        description: dto.description,
        evidence: dto.evidence ? dto.evidence : undefined,
        status: DisputeStatus.OPEN,
      },
      include: {
        openedBy: { select: { id: true, name: true, email: true } },
        respondent: { select: { id: true, name: true, email: true } },
        match: {
          include: {
            experience: { select: { title: true, city: true } },
          },
        },
      },
    });

    // Audit log
    await this.auditService.log({
      userId,
      action: 'dispute_opened',
      entity: 'dispute',
      entityId: dispute.id,
      data: { matchId: dto.matchId, reason: dto.reason },
    });

    // Notificar al respondent
    await this.notificationsService.create({
      userId: respondentId,
      type: 'dispute_opened',
      title: 'Se ha abierto una disputa',
      message: `${dispute.openedBy.name} ha abierto una disputa sobre "${match.experience.title}"`,
      data: { disputeId: dispute.id, matchId: dto.matchId },
    });

    // Enviar emails a ambas partes
    const reasonDescription = this.getReasonDescription(dto.reason);

    await Promise.all([
      // Email al opener (confirmación)
      this.emailService.sendDisputeOpenedEmail(
        dispute.openedBy.email,
        dispute.openedBy.name,
        true,
        dispute.id,
        match.experience.title,
        dispute.respondent.name,
        reasonDescription,
        dto.description,
      ),
      // Email al respondent
      this.emailService.sendDisputeOpenedEmail(
        dispute.respondent.email,
        dispute.respondent.name,
        false,
        dispute.id,
        match.experience.title,
        dispute.openedBy.name,
        reasonDescription,
        dto.description,
      ),
    ]);

    this.logger.log(
      `Disputa ${dispute.id} abierta por ${userId} para match ${dto.matchId}`,
    );

    return dispute;
  }

  /**
   * Añadir mensaje a una disputa
   */
  async addMessage(
    userId: string,
    disputeId: string,
    dto: AddDisputeMessageDto,
  ) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        openedBy: { select: { id: true, name: true, email: true } },
        respondent: { select: { id: true, name: true, email: true } },
        match: {
          include: {
            experience: { select: { title: true } },
          },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Disputa no encontrada');
    }

    // Verificar que el usuario es parte de la disputa o es admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, name: true },
    });

    const isAdmin = user?.role === 'admin';
    const isParty =
      dispute.openedById === userId || dispute.respondentId === userId;

    if (!isParty && !isAdmin) {
      throw new ForbiddenException('No tienes acceso a esta disputa');
    }

    // No se pueden añadir mensajes a disputas cerradas
    if (
      [
        'RESOLVED_REFUND',
        'RESOLVED_PARTIAL_REFUND',
        'RESOLVED_NO_REFUND',
        'CLOSED',
      ].includes(dispute.status)
    ) {
      throw new BadRequestException('Esta disputa ya ha sido resuelta');
    }

    // Crear mensaje
    const message = await this.prisma.disputeMessage.create({
      data: {
        disputeId,
        senderId: userId,
        content: dto.content,
        isAdmin,
        attachments: dto.attachments ? dto.attachments : undefined,
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Notificar a la otra parte
    const recipientId =
      dispute.openedById === userId ? dispute.respondentId : dispute.openedById;
    const recipient =
      dispute.openedById === userId ? dispute.respondent : dispute.openedBy;

    await this.notificationsService.create({
      userId: recipientId,
      type: 'dispute_message',
      title: 'Nuevo mensaje en disputa',
      message: `${user?.name || 'Alguien'} ha enviado un mensaje en la disputa`,
      data: { disputeId, messageId: message.id },
    });

    // Enviar email
    await this.emailService.sendDisputeMessageEmail(
      recipient.email,
      recipient.name,
      user?.name || 'Usuario',
      isAdmin,
      disputeId,
      dto.content.slice(0, 200),
    );

    return message;
  }

  /**
   * Obtener disputas del usuario
   */
  async getUserDisputes(userId: string, status?: string) {
    const where: Record<string, unknown> = {
      OR: [{ openedById: userId }, { respondentId: userId }],
    };

    if (status) {
      where.status = status;
    }

    return this.prisma.dispute.findMany({
      where,
      include: {
        openedBy: { select: { id: true, name: true, avatar: true } },
        respondent: { select: { id: true, name: true, avatar: true } },
        match: {
          include: {
            experience: { select: { id: true, title: true, city: true } },
          },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Obtener detalle de una disputa
   */
  async getDisputeDetail(userId: string, disputeId: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        openedBy: {
          select: { id: true, name: true, avatar: true, email: true },
        },
        respondent: {
          select: { id: true, name: true, avatar: true, email: true },
        },
        resolvedBy: { select: { id: true, name: true } },
        match: {
          include: {
            experience: {
              select: { id: true, title: true, city: true, photos: true },
            },
          },
        },
        messages: {
          include: {
            sender: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Disputa no encontrada');
    }

    // Verificar acceso
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const isAdmin = user?.role === 'admin';
    const isParty =
      dispute.openedById === userId || dispute.respondentId === userId;

    if (!isParty && !isAdmin) {
      throw new ForbiddenException('No tienes acceso a esta disputa');
    }

    return dispute;
  }

  /**
   * Resolver disputa (solo admin)
   */
  async resolveDispute(
    adminId: string,
    disputeId: string,
    dto: ResolveDisputeDto,
  ) {
    // Verificar que es admin
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true, name: true },
    });

    if (admin?.role !== 'admin') {
      throw new ForbiddenException(
        'Solo los administradores pueden resolver disputas',
      );
    }

    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        openedBy: { select: { id: true, name: true, email: true } },
        respondent: { select: { id: true, name: true, email: true } },
        match: {
          include: {
            experience: { select: { title: true } },
            requester: { select: { id: true } },
          },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Disputa no encontrada');
    }

    if (
      [
        'RESOLVED_REFUND',
        'RESOLVED_PARTIAL_REFUND',
        'RESOLVED_NO_REFUND',
        'CLOSED',
      ].includes(dispute.status)
    ) {
      throw new BadRequestException('Esta disputa ya ha sido resuelta');
    }

    let refundAmount: number | undefined;
    let refundPercentage: number | undefined;

    // Determinar a quién va el reembolso (por defecto al requester)
    let refundRecipientId = dispute.match.requesterId;
    if (dto.favoredParty === 'opener') {
      refundRecipientId = dispute.openedById;
    } else if (dto.favoredParty === 'respondent') {
      refundRecipientId = dispute.respondentId;
    }

    // Calcular reembolso si aplica
    if (dispute.match.totalPrice) {
      switch (dto.resolution) {
        case 'RESOLVED_REFUND':
          refundPercentage = 100;
          refundAmount = dispute.match.totalPrice;
          break;
        case 'RESOLVED_PARTIAL_REFUND':
          refundPercentage = dto.refundPercentage || 50;
          refundAmount =
            Math.round(
              ((dispute.match.totalPrice * refundPercentage) / 100) * 100,
            ) / 100;
          break;
        case 'RESOLVED_NO_REFUND':
        case 'CLOSED':
          refundPercentage = 0;
          refundAmount = 0;
          break;
      }

      // Procesar reembolso al beneficiario
      if (refundAmount && refundAmount > 0) {
        await this.walletService.addBalance(
          refundRecipientId,
          refundAmount,
          `Reembolso por disputa: ${dispute.match.experience.title}`,
          dispute.matchId,
        );
      }
    }

    // Actualizar disputa
    const updatedDispute = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: dto.resolution as DisputeStatus,
        resolution: dto.resolutionDescription,
        resolvedById: adminId,
        refundAmount,
        refundPercentage,
        resolvedAt: new Date(),
      },
      include: {
        openedBy: { select: { id: true, name: true, email: true } },
        respondent: { select: { id: true, name: true, email: true } },
        match: {
          include: {
            experience: { select: { title: true } },
          },
        },
      },
    });

    // Audit log
    await this.auditService.logAdminAction(
      adminId,
      'resolve_dispute',
      'dispute',
      disputeId,
      {
        resolution: dto.resolution,
        refundAmount,
        refundPercentage,
        favoredParty: dto.favoredParty || 'requester',
        refundRecipientId,
      },
    );

    // Notificar y enviar emails a ambas partes
    const notifyPromises = [
      // Opener
      this.notificationsService.create({
        userId: dispute.openedById,
        type: 'dispute_resolved',
        title: 'Disputa resuelta',
        message: `Tu disputa ha sido resuelta`,
        data: { disputeId, resolution: dto.resolution, refundAmount },
      }),
      this.emailService.sendDisputeResolvedEmail(
        dispute.openedBy.email,
        dispute.openedBy.name,
        disputeId,
        dispute.match.experience.title,
        dto.resolution,
        dto.resolutionDescription,
        refundRecipientId === dispute.openedById
          ? refundAmount
          : undefined,
        refundRecipientId === dispute.openedById
          ? refundPercentage
          : undefined,
      ),
      // Respondent
      this.notificationsService.create({
        userId: dispute.respondentId,
        type: 'dispute_resolved',
        title: 'Disputa resuelta',
        message: `La disputa ha sido resuelta`,
        data: { disputeId, resolution: dto.resolution },
      }),
      this.emailService.sendDisputeResolvedEmail(
        dispute.respondent.email,
        dispute.respondent.name,
        disputeId,
        dispute.match.experience.title,
        dto.resolution,
        dto.resolutionDescription,
        // Solo mostrar reembolso al que lo recibe
        refundRecipientId === dispute.respondentId
          ? refundAmount
          : undefined,
        refundRecipientId === dispute.respondentId
          ? refundPercentage
          : undefined,
      ),
    ];

    await Promise.all(notifyPromises);

    this.logger.log(
      `Disputa ${disputeId} resuelta por admin ${adminId}: ${dto.resolution}`,
    );

    return updatedDispute;
  }

  /**
   * Obtener todas las disputas (admin) con filtros avanzados
   */
  async getAllDisputes(filters: DisputeFilters = {}) {
    const { status, reason, search, dateFrom, dateTo, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;
    const where: Prisma.DisputeWhereInput = {};

    if (status) {
      where.status = status as DisputeStatus;
    }
    if (reason) {
      where.reason = reason as DisputeReason;
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { openedBy: { name: { contains: search, mode: 'insensitive' } } },
        { respondent: { name: { contains: search, mode: 'insensitive' } } },
        { match: { experience: { title: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [disputes, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where,
        include: {
          openedBy: { select: { id: true, name: true, avatar: true } },
          respondent: { select: { id: true, name: true, avatar: true } },
          match: {
            include: {
              experience: { select: { id: true, title: true, city: true } },
            },
          },
          _count: { select: { messages: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.dispute.count({ where }),
    ]);

    return {
      disputes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Cambiar estado de disputa a "En revisión" (admin)
   */
  async markUnderReview(adminId: string, disputeId: string) {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true },
    });

    if (admin?.role !== 'admin') {
      throw new ForbiddenException(
        'Solo los administradores pueden revisar disputas',
      );
    }

    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException('Disputa no encontrada');
    }

    if (dispute.status !== 'OPEN') {
      throw new BadRequestException(
        'Solo se pueden marcar como en revisión disputas abiertas',
      );
    }

    const updated = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: { status: DisputeStatus.UNDER_REVIEW },
    });

    await this.auditService.logAdminAction(
      adminId,
      'mark_under_review',
      'dispute',
      disputeId,
    );

    return updated;
  }

  /**
   * Obtener disputa activa para un match (para indicador en chat)
   */
  async getActiveDisputeForMatch(userId: string, matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { hostId: true, requesterId: true },
    });

    if (!match) {
      throw new NotFoundException('Reserva no encontrada');
    }

    if (match.hostId !== userId && match.requesterId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta reserva');
    }

    const dispute = await this.prisma.dispute.findFirst({
      where: {
        matchId,
        status: { in: ['OPEN', 'UNDER_REVIEW'] },
      },
      select: {
        id: true,
        status: true,
        reason: true,
        createdAt: true,
      },
    });

    return { dispute };
  }

  /**
   * Auto-cerrar disputas sin actividad en 30 días
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async autoCloseStaleDisputes() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - STALE_DISPUTE_DAYS);

    const staleDisputes = await this.prisma.dispute.findMany({
      where: {
        status: { in: ['OPEN', 'UNDER_REVIEW'] },
        updatedAt: { lt: cutoff },
      },
      include: {
        openedBy: { select: { id: true, name: true, email: true } },
        respondent: { select: { id: true, name: true, email: true } },
        match: {
          include: { experience: { select: { title: true } } },
        },
      },
    });

    if (staleDisputes.length === 0) return;

    for (const dispute of staleDisputes) {
      await this.prisma.dispute.update({
        where: { id: dispute.id },
        data: {
          status: DisputeStatus.CLOSED,
          resolution: `Cerrada automáticamente por inactividad (${STALE_DISPUTE_DAYS} días sin actividad)`,
          resolvedAt: new Date(),
        },
      });

      await this.auditService.log({
        action: 'dispute_auto_closed',
        entity: 'dispute',
        entityId: dispute.id,
        data: { reason: 'stale', daysSinceUpdate: STALE_DISPUTE_DAYS },
      });

      // Notificar a ambas partes
      await Promise.all([
        this.notificationsService.create({
          userId: dispute.openedById,
          type: 'dispute_closed',
          title: 'Disputa cerrada',
          message: `Tu disputa sobre "${dispute.match.experience.title}" ha sido cerrada por inactividad`,
          data: { disputeId: dispute.id },
        }),
        this.notificationsService.create({
          userId: dispute.respondentId,
          type: 'dispute_closed',
          title: 'Disputa cerrada',
          message: `La disputa sobre "${dispute.match.experience.title}" ha sido cerrada por inactividad`,
          data: { disputeId: dispute.id },
        }),
      ]);
    }

    this.logger.log(
      `Auto-cerradas ${staleDisputes.length} disputas por inactividad`,
    );
  }

  /**
   * Exportar disputas a CSV
   */
  async exportDisputesCsv(filters: Omit<DisputeFilters, 'page' | 'limit'> = {}) {
    const where: Prisma.DisputeWhereInput = {};

    if (filters.status) where.status = filters.status as DisputeStatus;
    if (filters.reason) where.reason = filters.reason as DisputeReason;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const disputes = await this.prisma.dispute.findMany({
      where,
      include: {
        openedBy: { select: { name: true, email: true } },
        respondent: { select: { name: true, email: true } },
        resolvedBy: { select: { name: true } },
        match: {
          include: {
            experience: { select: { title: true, city: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'ID,Fecha,Estado,Motivo,Experiencia,Ciudad,Abierta por,Email opener,Contra,Email respondent,Resuelta por,Reembolso,Porcentaje,Descripcion,Resolucion\n';
    const rows = disputes.map((d) => {
      const escape = (s: string | null | undefined) =>
        `"${(s || '').replace(/"/g, '""')}"`;
      return [
        d.id,
        d.createdAt.toISOString(),
        d.status,
        d.reason,
        escape(d.match.experience.title),
        escape(d.match.experience.city),
        escape(d.openedBy.name),
        d.openedBy.email,
        escape(d.respondent.name),
        d.respondent.email,
        escape(d.resolvedBy?.name),
        d.refundAmount ?? '',
        d.refundPercentage ?? '',
        escape(d.description),
        escape(d.resolution),
      ].join(',');
    });

    return '\uFEFF' + header + rows.join('\n');
  }

  /**
   * Obtener estadísticas de disputas (admin)
   */
  async getDisputeStats() {
    const [byStatus, byReason, recent] = await Promise.all([
      this.prisma.dispute.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.dispute.groupBy({
        by: ['reason'],
        _count: true,
      }),
      this.prisma.dispute.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const totalRefunded = await this.prisma.dispute.aggregate({
      where: {
        status: { in: ['RESOLVED_REFUND', 'RESOLVED_PARTIAL_REFUND'] },
      },
      _sum: { refundAmount: true },
    });

    return {
      byStatus: byStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      byReason: byReason.reduce(
        (acc, item) => {
          acc[item.reason] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      last30Days: recent,
      totalRefunded: totalRefunded._sum.refundAmount || 0,
    };
  }
}
