import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IdentityService {
  constructor(private prisma: PrismaService) {}

  // Submit identity verification documents
  async submitVerification(
    userId: string,
    documentPath: string,
    selfiePath: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (user.identityVerified) {
      throw new BadRequestException('Ya tienes la identidad verificada');
    }

    if (user.identityStatus === 'pending') {
      throw new BadRequestException(
        'Ya tienes una solicitud de verificacion pendiente',
      );
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        identityDocument: documentPath,
        identitySelfie: selfiePath,
        identityStatus: 'pending',
        identitySubmittedAt: new Date(),
        identityRejectReason: null,
      },
      select: {
        id: true,
        identityStatus: true,
        identitySubmittedAt: true,
      },
    });
  }

  // Get verification status
  async getVerificationStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        identityVerified: true,
        identityStatus: true,
        identitySubmittedAt: true,
        identityReviewedAt: true,
        identityRejectReason: true,
      },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    return user;
  }

  // Admin: Get pending verifications
  async getPendingVerifications(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { identityStatus: 'pending' },
        skip,
        take: limit,
        orderBy: { identitySubmittedAt: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          identityDocument: true,
          identitySelfie: true,
          identitySubmittedAt: true,
        },
      }),
      this.prisma.user.count({ where: { identityStatus: 'pending' } }),
    ]);

    return {
      verifications: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Admin: Approve verification
  async approveVerification(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (user.identityStatus !== 'pending') {
      throw new BadRequestException('No hay verificacion pendiente');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        identityVerified: true,
        identityStatus: 'approved',
        identityReviewedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        identityVerified: true,
        identityStatus: true,
      },
    });
  }

  // Admin: Reject verification
  async rejectVerification(userId: string, reason: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (user.identityStatus !== 'pending') {
      throw new BadRequestException('No hay verificacion pendiente');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        identityStatus: 'rejected',
        identityRejectReason: reason,
        identityReviewedAt: new Date(),
        // Clear documents so user can resubmit
        identityDocument: null,
        identitySelfie: null,
      },
      select: {
        id: true,
        name: true,
        identityStatus: true,
        identityRejectReason: true,
      },
    });
  }

  // Admin: Get verification stats
  async getStats() {
    const [pending, approved, rejected, total] = await Promise.all([
      this.prisma.user.count({ where: { identityStatus: 'pending' } }),
      this.prisma.user.count({ where: { identityStatus: 'approved' } }),
      this.prisma.user.count({ where: { identityStatus: 'rejected' } }),
      this.prisma.user.count({ where: { identityStatus: { not: null } } }),
    ]);

    return { pending, approved, rejected, total };
  }
}
