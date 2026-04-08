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
      this.logger.log(
        `User ${userId} resubmitted verification (attempt ${updated.attempts})`,
      );
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
      this.prisma.user.count({ where: { verified: true } }),
      this.prisma.user.count({ where: { verified: false } }),
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

    const where: Record<string, unknown> = {};
    if (status === VerificationStatus.VERIFIED) {
      where.verified = true;
    } else if (status === VerificationStatus.PENDING) {
      where.verified = false;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          verified: true,
          createdAt: true,
        },
        orderBy: [{ verified: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    const verifications = users.map((u) => ({
      id: u.id,
      status: u.verified
        ? ('VERIFIED' as VerificationStatus)
        : ('PENDING' as VerificationStatus),
      createdAt: u.createdAt,
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
        verified: true,
        createdAt: true,
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
      verified: user.verified,
      createdAt: user.createdAt,
    };
  }

  /**
   * Admin: Verificar/desverificar un usuario manualmente
   */
  async toggleVerification(
    userId: string,
    adminId: string,
    newVerified: boolean,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { verified: newVerified },
    });

    this.logger.log(
      `Admin ${adminId} ${newVerified ? 'verified' : 'unverified'} user ${userId}`,
    );

    return { userId, verified: newVerified };
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
