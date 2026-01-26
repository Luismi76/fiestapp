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
  AdminVerificationListResponseDto,
} from './dto/verification.dto';
import { NotificationsService } from '../notifications/notifications.service';

// Interface for verification list query result
interface VerificationWithUser {
  id: string;
  status: string;
  documentType: string;
  attempts: number;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
}

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Create or update an identity verification request
   */
  async createVerification(
    userId: string,
    dto: CreateVerificationDto,
  ): Promise<VerificationResponseDto> {
    // Check if user already has a verification
    const existing = await this.prisma.identityVerification.findUnique({
      where: { userId },
    });

    if (existing) {
      // If verified, don't allow new submissions
      if (existing.status === 'VERIFIED') {
        throw new BadRequestException('Tu identidad ya está verificada');
      }

      // If pending, don't allow resubmission
      if (existing.status === 'PENDING') {
        throw new BadRequestException(
          'Ya tienes una solicitud de verificación pendiente',
        );
      }

      // If rejected, allow resubmission (update existing)
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

    // Create new verification
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

  /**
   * Get user's verification status
   */
  async getMyVerification(
    userId: string,
  ): Promise<VerificationResponseDto | null> {
    const verification = await this.prisma.identityVerification.findUnique({
      where: { userId },
    });

    if (!verification) {
      return null;
    }

    return this.mapToResponse(verification);
  }

  /**
   * Admin: Get all verifications (paginated)
   */
  async getVerifications(
    status?: VerificationStatus,
    page: number = 1,
    limit: number = 20,
  ): Promise<AdminVerificationListResponseDto> {
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [rawVerifications, total] = await Promise.all([
      this.prisma.identityVerification.findMany({
        where,
        select: {
          id: true,
          status: true,
          documentType: true,
          attempts: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.identityVerification.count({ where }),
    ]);

    const verifications = rawVerifications as VerificationWithUser[];

    return {
      verifications: verifications.map((v) => ({
        id: v.id,
        status: v.status as VerificationStatus,
        documentType: v.documentType as DocumentType,
        attempts: v.attempts,
        createdAt: v.createdAt,
        user: {
          id: v.user.id,
          name: v.user.name,
          email: v.user.email,
          avatarUrl: v.user.avatar,
        },
      })),
      total,
      page,
      limit,
      hasMore: skip + verifications.length < total,
    };
  }

  /**
   * Admin: Get verification details
   */
  async getVerificationById(id: string): Promise<VerificationResponseDto> {
    const verification = await this.prisma.identityVerification.findUnique({
      where: { id },
    });

    if (!verification) {
      throw new NotFoundException('Verificación no encontrada');
    }

    return this.mapToResponse(verification);
  }

  /**
   * Admin: Review (approve/reject) a verification
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

    // Update verification
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

    // Update user's verified status if approved
    if (dto.status === VerificationStatus.VERIFIED) {
      await this.prisma.user.update({
        where: { id: verification.userId },
        data: { identityVerified: true },
      });

      // Notify user of approval
      await this.notificationsService.create({
        userId: verification.userId,
        type: 'system',
        title: 'Identidad verificada',
        message:
          '¡Tu identidad ha sido verificada! Ahora tienes acceso a todas las funciones de la plataforma.',
      });

      this.logger.log(
        `Verification ${id} approved by admin ${adminId} for user ${verification.userId}`,
      );
    } else {
      // Notify user of rejection
      await this.notificationsService.create({
        userId: verification.userId,
        type: 'system',
        title: 'Verificación rechazada',
        message: `Tu solicitud de verificación ha sido rechazada. Motivo: ${dto.rejectionReason}. Puedes enviar una nueva solicitud.`,
      });

      this.logger.log(
        `Verification ${id} rejected by admin ${adminId}: ${dto.rejectionReason}`,
      );
    }

    return this.mapToResponse(updated);
  }

  /**
   * Get verification statistics (for admin dashboard)
   */
  async getVerificationStats() {
    const [pending, verified, rejected, total] = await Promise.all([
      this.prisma.identityVerification.count({ where: { status: 'PENDING' } }),
      this.prisma.identityVerification.count({ where: { status: 'VERIFIED' } }),
      this.prisma.identityVerification.count({ where: { status: 'REJECTED' } }),
      this.prisma.identityVerification.count(),
    ]);

    return {
      pending,
      verified,
      rejected,
      total,
      approvalRate: total > 0 ? Math.round((verified / total) * 100) : 0,
    };
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
