import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

export interface UserDataExport {
  exportedAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    age?: number;
    city?: string;
    bio?: string;
    phone?: string;
    hasPartner?: boolean;
    hasChildren?: boolean;
    childrenAges?: string;
    verified: boolean;
    createdAt: string;
    termsAcceptedAt?: string;
  };
  experiences: Array<{
    id: string;
    title: string;
    description: string;
    city: string;
    price?: number;
    createdAt: string;
  }>;
  matchesAsHost: Array<{
    id: string;
    status: string;
    createdAt: string;
    experienceTitle: string;
  }>;
  matchesAsRequester: Array<{
    id: string;
    status: string;
    createdAt: string;
    experienceTitle: string;
  }>;
  reviewsGiven: Array<{
    id: string;
    rating: number;
    comment?: string;
    createdAt: string;
  }>;
  reviewsReceived: Array<{
    id: string;
    rating: number;
    comment?: string;
    createdAt: string;
  }>;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
  favorites: Array<{
    experienceId: string;
    experienceTitle: string;
    createdAt: string;
  }>;
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
  }>;
  wallet?: {
    balance: number;
    currency: string;
  };
}

@Injectable()
export class GdprService {
  private readonly logger = new Logger(GdprService.name);

  constructor(private prisma: PrismaService) {}

  // Exportar todos los datos del usuario en formato JSON
  async exportUserData(userId: string): Promise<UserDataExport> {
    this.logger.log(`Exporting data for user ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        experiences: {
          select: {
            id: true,
            title: true,
            description: true,
            city: true,
            price: true,
            createdAt: true,
          },
        },
        matchesAsHost: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            experience: { select: { title: true } },
          },
        },
        matchesAsRequester: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            experience: { select: { title: true } },
          },
        },
        reviewsGiven: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
          },
        },
        reviewsReceived: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
          },
        },
        transactions: {
          select: {
            id: true,
            type: true,
            amount: true,
            status: true,
            createdAt: true,
          },
        },
        favorites: {
          select: {
            experienceId: true,
            createdAt: true,
            experience: { select: { title: true } },
          },
        },
        notifications: {
          select: {
            id: true,
            type: true,
            title: true,
            message: true,
            read: true,
            createdAt: true,
          },
        },
        wallet: {
          select: {
            balance: true,
            currency: true,
          },
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    return {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        age: user.age ?? undefined,
        city: user.city ?? undefined,
        bio: user.bio ?? undefined,
        phone: user.phone ?? undefined,
        hasPartner: user.hasPartner ?? undefined,
        hasChildren: user.hasChildren ?? undefined,
        childrenAges: user.childrenAges ?? undefined,
        verified: user.verified,
        createdAt: user.createdAt.toISOString(),
        termsAcceptedAt: user.termsAcceptedAt?.toISOString(),
      },
      experiences: user.experiences.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        city: e.city,
        price: e.price ?? undefined,
        createdAt: e.createdAt.toISOString(),
      })),
      matchesAsHost: user.matchesAsHost.map((m) => ({
        id: m.id,
        status: m.status,
        createdAt: m.createdAt.toISOString(),
        experienceTitle: m.experience.title,
      })),
      matchesAsRequester: user.matchesAsRequester.map((m) => ({
        id: m.id,
        status: m.status,
        createdAt: m.createdAt.toISOString(),
        experienceTitle: m.experience.title,
      })),
      reviewsGiven: user.reviewsGiven.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment ?? undefined,
        createdAt: r.createdAt.toISOString(),
      })),
      reviewsReceived: user.reviewsReceived.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment ?? undefined,
        createdAt: r.createdAt.toISOString(),
      })),
      transactions: user.transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
      })),
      favorites: user.favorites.map((f) => ({
        experienceId: f.experienceId,
        experienceTitle: f.experience.title,
        createdAt: f.createdAt.toISOString(),
      })),
      notifications: user.notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      })),
      wallet: user.wallet
        ? {
            balance: user.wallet.balance,
            currency: user.wallet.currency,
          }
        : undefined,
    };
  }

  // Solicitar eliminación de cuenta (anonimización en lugar de borrado físico)
  async requestAccountDeletion(
    userId: string,
    reason?: string,
  ): Promise<{ message: string; deletionScheduledAt: string }> {
    this.logger.log(`Account deletion requested for user ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    // Programar la eliminación para 30 días después (período de gracia)
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

    // Crear un registro de auditoría
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'deletion_requested',
        entity: 'user',
        entityId: userId,
        data: {
          reason: reason ?? 'No especificado',
          scheduledFor: deletionDate.toISOString(),
        },
      },
    });

    return {
      message:
        'Tu solicitud de eliminación ha sido registrada. Tu cuenta será eliminada permanentemente en 30 días. Puedes cancelar esta solicitud iniciando sesión durante este período.',
      deletionScheduledAt: deletionDate.toISOString(),
    };
  }

  // Anonimizar datos del usuario (soft delete / GDPR compliant)
  async anonymizeUser(userId: string): Promise<void> {
    this.logger.log(`Anonymizing user ${userId}`);

    const anonymousId = `deleted_${uuidv4().substring(0, 8)}`;
    const anonymousEmail = `${anonymousId}@deleted.fiestapp.com`;

    await this.prisma.$transaction(async (tx) => {
      // Anonimizar datos personales del usuario
      await tx.user.update({
        where: { id: userId },
        data: {
          email: anonymousEmail,
          name: 'Usuario eliminado',
          password: uuidv4(), // Contraseña aleatoria inútil
          age: null,
          bio: null,
          city: null,
          avatar: null,
          phone: null,
          phoneVerified: false,
          hasPartner: null,
          hasChildren: null,
          childrenAges: null,
          verified: false,
          emailVerificationToken: null,
          emailVerificationExpires: null,
          passwordResetToken: null,
          passwordResetExpires: null,
          twoFactorSecret: null,
          twoFactorEnabled: false,
          referralCode: null,
          bannedAt: new Date(),
          banReason: 'Cuenta eliminada por el usuario (GDPR)',
        },
      });

      // Eliminar suscripciones push
      await tx.pushSubscription.deleteMany({
        where: { userId },
      });

      // Eliminar preferencias de notificación
      await tx.notificationPreference.deleteMany({
        where: { userId },
      });

      // Eliminar historial de búsqueda
      await tx.searchHistory.deleteMany({
        where: { userId },
      });

      // Eliminar respuestas rápidas
      await tx.quickReply.deleteMany({
        where: { userId },
      });

      // Eliminar favoritos
      await tx.favorite.deleteMany({
        where: { userId },
      });

      // Eliminar festivales favoritos
      await tx.favoriteFestival.deleteMany({
        where: { userId },
      });

      // Eliminar bloqueos
      await tx.blockedUser.deleteMany({
        where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      });

      // Anonimizar mensajes (mantener contenido para historial de conversaciones)
      // pero el senderId ya no se podrá vincular al usuario original

      // Registrar la anonimización
      await tx.auditLog.create({
        data: {
          action: 'user_anonymized',
          entity: 'user',
          entityId: userId,
          data: {
            anonymizedTo: anonymousId,
            reason: 'GDPR deletion request',
          },
        },
      });
    });

    this.logger.log(`User ${userId} successfully anonymized to ${anonymousId}`);
  }

  // Cancelar solicitud de eliminación
  async cancelDeletionRequest(userId: string): Promise<{ message: string }> {
    this.logger.log(`Cancelling deletion request for user ${userId}`);

    // Buscar solicitud de eliminación pendiente
    const deletionRequest = await this.prisma.auditLog.findFirst({
      where: {
        userId,
        action: 'deletion_requested',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!deletionRequest) {
      throw new BadRequestException(
        'No hay solicitud de eliminación pendiente',
      );
    }

    // Registrar la cancelación
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'deletion_cancelled',
        entity: 'user',
        entityId: userId,
        data: {
          originalRequestId: deletionRequest.id,
        },
      },
    });

    return {
      message: 'Tu solicitud de eliminación ha sido cancelada.',
    };
  }

  // Obtener estado de solicitud de eliminación
  async getDeletionStatus(
    userId: string,
  ): Promise<{ hasPendingDeletion: boolean; scheduledFor?: string }> {
    const deletionRequest = await this.prisma.auditLog.findFirst({
      where: {
        userId,
        action: 'deletion_requested',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!deletionRequest) {
      return { hasPendingDeletion: false };
    }

    // Verificar si fue cancelada
    const cancellation = await this.prisma.auditLog.findFirst({
      where: {
        userId,
        action: 'deletion_cancelled',
        createdAt: { gt: deletionRequest.createdAt },
      },
    });

    if (cancellation) {
      return { hasPendingDeletion: false };
    }

    const data = deletionRequest.data as { scheduledFor?: string } | null;

    return {
      hasPendingDeletion: true,
      scheduledFor: data?.scheduledFor,
    };
  }
}
