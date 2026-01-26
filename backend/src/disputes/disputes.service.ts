import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateDisputeDto,
  AddDisputeMessageDto,
  ResolveDisputeDto,
} from './dto/create-dispute.dto';
import { DisputeStatus, DisputeReason } from '@prisma/client';

@Injectable()
export class DisputesService {
  private readonly logger = new Logger(DisputesService.name);

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
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

      // Procesar reembolso al viajero si hay monto
      if (refundAmount && refundAmount > 0) {
        await this.walletService.addBalance(
          dispute.match.requesterId,
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
        refundAmount,
        refundPercentage,
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
        // Solo mostrar reembolso al que lo recibe (el viajero si es opener o respondent)
        dispute.match.requesterId === dispute.openedById
          ? refundAmount
          : undefined,
        dispute.match.requesterId === dispute.openedById
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
   * Obtener todas las disputas (admin)
   */
  async getAllDisputes(status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
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

    return this.prisma.dispute.update({
      where: { id: disputeId },
      data: { status: DisputeStatus.UNDER_REVIEW },
    });
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
