import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateVerificationDto,
  AdminReviewVerificationDto,
  VerificationResponseDto,
  VerificationStatus,
  DocumentType,
} from './dto/verification.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  // ========== User Endpoints ==========

  async createVerification(
    userId: string,
    dto: CreateVerificationDto,
  ): Promise<VerificationResponseDto> {
    const existing = await this.prisma.identityVerification.findUnique({
      where: { userId },
    });

    if (existing) {
      if (existing.status === 'VERIFIED') {
        throw new BadRequestException('Tu identidad ya está verificada');
      }
      if (existing.status === 'PENDING') {
        throw new BadRequestException(
          'Ya tienes una solicitud de verificación pendiente',
        );
      }
      // Rejected → allow resubmission
      const updated = await this.prisma.identityVerification.update({
        where: { userId },
        data: {
          documentType: dto.documentType,
          documentFront: dto.documentFront,
          documentBack: dto.documentBack,
          selfie: dto.selfie,
          status: 'PENDING',
          rejectionReason: null,
          verifiedAt: null,
          verifiedById: null,
          attempts: { increment: 1 },
        },
      });
      this.logger.log(`User ${userId} resubmitted verification (attempt ${updated.attempts})`);
      return this.mapToResponse(updated);
    }

    const verification = await this.prisma.identityVerification.create({
      data: {
        userId,
        documentType: dto.documentType,
        documentFront: dto.documentFront,
        documentBack: dto.documentBack,
        selfie: dto.selfie,
      },
    });
    this.logger.log(`User ${userId} submitted identity verification`);
    return this.mapToResponse(verification);
  }

  async getMyVerification(
    userId: string,
  ): Promise<VerificationResponseDto | null> {
    const verification = await this.prisma.identityVerification.findUnique({
      where: { userId },
    });
    if (!verification) return null;
    return this.mapToResponse(verification);
  }

  // ========== Admin Endpoints (basados en usuarios reales) ==========

  /**
   * Stats basadas en usuarios reales
   */
  async getVerificationStats() {
    const [verified, pending, total] = await Promise.all([
      this.prisma.user.count({ where: { identityVerified: true } }),
      this.prisma.user.count({ where: { identityVerified: false } }),
      this.prisma.user.count(),
    ]);

    return {
      pending,
      verified,
      rejected: 0,
      total,
      approvalRate: total > 0 ? Math.round((verified / total) * 100) : 0,
    };
  }

  /**
   * Lista de usuarios con su estado de verificación
   */
  async getVerifications(
    status?: VerificationStatus,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    // Filtro sobre identityVerified del usuario
    const where: Record<string, unknown> = {};
    if (status === VerificationStatus.VERIFIED) {
      where.identityVerified = true;
    } else if (status === VerificationStatus.PENDING) {
      where.identityVerified = false;
    }
    // REJECTED y ALL no filtran

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          identityVerified: true,
          createdAt: true,
          identityVerification: {
            select: {
              id: true,
              status: true,
              documentType: true,
              attempts: true,
            },
          },
        },
        orderBy: [{ identityVerified: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    const verifications = users.map((u) => ({
      id: u.id, // usamos el userId como id del item
      status: u.identityVerified
        ? ('VERIFIED' as VerificationStatus)
        : ('PENDING' as VerificationStatus),
      documentType: u.identityVerification?.documentType as DocumentType || null,
      attempts: u.identityVerification?.attempts ?? 0,
      createdAt: u.createdAt,
      hasDocuments: !!u.identityVerification,
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatar,
      },
    }));

    return {
      verifications,
      total,
      page,
      limit,
      hasMore: skip + users.length < total,
    };
  }

  /**
   * Detalle de verificación de un usuario (por userId)
   */
  async getVerificationById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        identityVerified: true,
        createdAt: true,
        identityVerification: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userAvatar: user.avatar,
      identityVerified: user.identityVerified,
      createdAt: user.createdAt,
      // Datos de documento (si existen)
      document: user.identityVerification
        ? {
            id: user.identityVerification.id,
            status: user.identityVerification.status,
            documentType: user.identityVerification.documentType,
            documentFront: user.identityVerification.documentFront,
            documentBack: user.identityVerification.documentBack,
            selfie: user.identityVerification.selfie,
            rejectionReason: user.identityVerification.rejectionReason,
            attempts: user.identityVerification.attempts,
            createdAt: user.identityVerification.createdAt,
          }
        : null,
    };
  }

  /**
   * Admin: Verificar/desverificar un usuario manualmente
   */
  async toggleVerification(userId: string, adminId: string, verified: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { identityVerified: verified },
    });

    // Si tiene un registro de IdentityVerification, actualizarlo también
    const iv = await this.prisma.identityVerification.findUnique({
      where: { userId },
    });
    if (iv) {
      await this.prisma.identityVerification.update({
        where: { userId },
        data: {
          status: verified ? 'VERIFIED' : 'REJECTED',
          verifiedAt: verified ? new Date() : null,
          verifiedById: verified ? adminId : null,
          rejectionReason: verified ? null : 'Desverificado por admin',
        },
      });
    }

    // Notificar al usuario
    if (verified) {
      await this.notificationsService.create({
        userId,
        type: 'system',
        title: 'Identidad verificada',
        message: 'Tu identidad ha sido verificada por un administrador.',
      });
    }

    this.logger.log(
      `Admin ${adminId} ${verified ? 'verified' : 'unverified'} user ${userId}`,
    );

    return { userId, identityVerified: verified };
  }

  /**
   * Admin: Review a document-based verification (approve/reject)
   */
  async reviewVerification(
    id: string,
    adminId: string,
    dto: AdminReviewVerificationDto,
  ): Promise<VerificationResponseDto> {
    const verification = await this.prisma.identityVerification.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!verification) {
      throw new NotFoundException('Verificación no encontrada');
    }

    if (verification.status !== 'PENDING') {
      throw new BadRequestException('Esta verificación ya ha sido revisada');
    }

    if (dto.status === VerificationStatus.REJECTED && !dto.rejectionReason) {
      throw new BadRequestException(
        'Debe proporcionar una razón para el rechazo',
      );
    }

    const updated = await this.prisma.identityVerification.update({
      where: { id },
      data: {
        status: dto.status,
        verifiedAt:
          dto.status === VerificationStatus.VERIFIED ? new Date() : null,
        verifiedById: adminId,
        rejectionReason:
          dto.status === VerificationStatus.REJECTED
            ? dto.rejectionReason
            : null,
      },
    });

    if (dto.status === VerificationStatus.VERIFIED) {
      await this.prisma.user.update({
        where: { id: verification.userId },
        data: { identityVerified: true },
      });

      await this.notificationsService.create({
        userId: verification.userId,
        type: 'system',
        title: 'Identidad verificada',
        message:
          '¡Tu identidad ha sido verificada! Ahora tienes acceso a todas las funciones de la plataforma.',
      });
    } else {
      await this.notificationsService.create({
        userId: verification.userId,
        type: 'system',
        title: 'Verificación rechazada',
        message: `Tu solicitud de verificación ha sido rechazada. Motivo: ${dto.rejectionReason}. Puedes enviar una nueva solicitud.`,
      });
    }

    return this.mapToResponse(updated);
  }

  private mapToResponse(verification: {
    id: string;
    userId: string;
    status: string;
    documentType: string;
    documentFront: string;
    documentBack: string | null;
    selfie: string | null;
    verifiedAt: Date | null;
    rejectionReason: string | null;
    attempts: number;
    createdAt: Date;
    updatedAt: Date;
  }): VerificationResponseDto {
    return {
      id: verification.id,
      userId: verification.userId,
      status: verification.status as VerificationStatus,
      documentType: verification.documentType as DocumentType,
      documentFront: verification.documentFront,
      documentBack: verification.documentBack,
      selfie: verification.selfie,
      verifiedAt: verification.verifiedAt,
      rejectionReason: verification.rejectionReason,
      attempts: verification.attempts,
      createdAt: verification.createdAt,
      updatedAt: verification.updatedAt,
    };
  }
}
