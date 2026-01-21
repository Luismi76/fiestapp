import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { MatchStatus } from './dto/update-match.dto';
import { PaymentsService } from '../payments/payments.service';
import { WalletService, PLATFORM_FEE } from '../wallet/wallet.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class MatchesService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => PaymentsService))
    private paymentsService: PaymentsService,
    private walletService: WalletService,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
  ) {}

  // Crear solicitud de match
  async create(createDto: CreateMatchDto, requesterId: string) {
    // Verificar que la experiencia existe y está publicada
    const experience = await this.prisma.experience.findUnique({
      where: { id: createDto.experienceId },
      include: { host: true },
      // No es include, usamos select para capacity
    });

    // Obtener capacity por separado
    const expWithCapacity = await this.prisma.experience.findUnique({
      where: { id: createDto.experienceId },
      select: { capacity: true },
    });

    if (!experience) {
      throw new NotFoundException('Experiencia no encontrada');
    }

    if (!experience.published) {
      throw new BadRequestException('Esta experiencia no está disponible');
    }

    // No puede solicitar su propia experiencia
    if (experience.hostId === requesterId) {
      throw new BadRequestException(
        'No puedes solicitar tu propia experiencia',
      );
    }

    // Verificar si hay bloqueo entre usuarios
    const hasBlock = await this.usersService.hasBlockBetweenUsers(
      requesterId,
      experience.hostId,
    );
    if (hasBlock) {
      throw new ForbiddenException(
        'No puedes solicitar experiencias de este usuario',
      );
    }

    // Verificar que no existe ya un match pendiente o aceptado
    const existingMatch = await this.prisma.match.findUnique({
      where: {
        experienceId_requesterId: {
          experienceId: createDto.experienceId,
          requesterId,
        },
      },
    });

    if (existingMatch) {
      if (
        existingMatch.status === 'pending' ||
        existingMatch.status === 'accepted'
      ) {
        throw new ConflictException(
          'Ya tienes una solicitud activa para esta experiencia',
        );
      }
    }

    // Verificar capacidad si hay fechas seleccionadas
    if (createDto.startDate) {
      const startDate = new Date(createDto.startDate);
      const endDate = createDto.endDate
        ? new Date(createDto.endDate)
        : startDate;

      // Contar matches activos que se solapan con las fechas seleccionadas
      const overlappingMatches = await this.prisma.match.count({
        where: {
          experienceId: createDto.experienceId,
          status: { in: ['pending', 'accepted'] },
          OR: [
            // Match con rango que se solapa
            {
              startDate: { lte: endDate },
              endDate: { gte: startDate },
            },
            // Match con solo startDate que cae en el rango
            {
              startDate: { gte: startDate, lte: endDate },
              endDate: null,
            },
          ],
        },
      });

      if (overlappingMatches >= (expWithCapacity?.capacity || 1)) {
        throw new BadRequestException(
          'No hay disponibilidad para las fechas seleccionadas. La experiencia está completa.',
        );
      }
    }

    // Crear el match
    const match = await this.prisma.match.create({
      data: {
        experienceId: createDto.experienceId,
        requesterId,
        hostId: experience.hostId,
        status: 'pending',
        startDate: createDto.startDate ? new Date(createDto.startDate) : null,
        endDate: createDto.endDate ? new Date(createDto.endDate) : null,
      },
      include: {
        experience: {
          include: {
            festival: true,
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
            avatar: true,
            verified: true,
            city: true,
          },
        },
        host: {
          select: {
            id: true,
            name: true,
            avatar: true,
            verified: true,
          },
        },
      },
    });

    // Si hay mensaje inicial, crearlo
    if (createDto.message) {
      await this.prisma.message.create({
        data: {
          matchId: match.id,
          senderId: requesterId,
          content: createDto.message,
        },
      });
    }

    return match;
  }

  // Obtener matches donde soy el host (solicitudes recibidas)
  async findReceivedMatches(hostId: string, status?: string) {
    const where: Record<string, unknown> = { hostId };
    if (status) {
      where.status = status;
    }

    return this.prisma.match.findMany({
      where,
      select: {
        id: true,
        experienceId: true,
        requesterId: true,
        hostId: true,
        status: true,
        paymentStatus: true,
        hostConfirmed: true,
        requesterConfirmed: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        updatedAt: true,
        experience: {
          select: {
            id: true,
            title: true,
            type: true,
            price: true,
            city: true,
            festival: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
            avatar: true,
            verified: true,
            city: true,
            bio: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  // Obtener matches donde soy el requester (mis solicitudes)
  async findSentMatches(requesterId: string, status?: string) {
    const where: Record<string, unknown> = { requesterId };
    if (status) {
      where.status = status;
    }

    return this.prisma.match.findMany({
      where,
      select: {
        id: true,
        experienceId: true,
        requesterId: true,
        hostId: true,
        status: true,
        paymentStatus: true,
        hostConfirmed: true,
        requesterConfirmed: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        updatedAt: true,
        experience: {
          select: {
            id: true,
            title: true,
            type: true,
            price: true,
            city: true,
            festival: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        host: {
          select: {
            id: true,
            name: true,
            avatar: true,
            verified: true,
            city: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  // Obtener un match por ID
  async findOne(id: string, userId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: {
        experience: {
          include: {
            festival: true,
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
            avatar: true,
            verified: true,
            city: true,
            bio: true,
            hasPartner: true,
            hasChildren: true,
            childrenAges: true,
          },
        },
        host: {
          select: {
            id: true,
            name: true,
            avatar: true,
            verified: true,
            city: true,
            bio: true,
            hasPartner: true,
            hasChildren: true,
            childrenAges: true,
          },
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!match) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    // Verificar que el usuario es parte del match
    if (match.hostId !== userId && match.requesterId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta solicitud');
    }

    // Marcar mensajes como leídos
    await this.prisma.message.updateMany({
      where: {
        matchId: id,
        senderId: { not: userId },
        read: false,
      },
      data: { read: true },
    });

    return match;
  }

  // Aceptar match (solo host)
  async accept(
    id: string,
    hostId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: { experience: true },
    });

    if (!match) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    if (match.hostId !== hostId) {
      throw new ForbiddenException(
        'Solo el anfitrión puede aceptar solicitudes',
      );
    }

    if (match.status !== 'pending') {
      throw new BadRequestException('Esta solicitud ya no está pendiente');
    }

    // Verificar pago si la experiencia es de pago
    if (match.experience.price && match.experience.price > 0) {
      if (match.paymentStatus !== 'held') {
        throw new BadRequestException(
          'El viajero debe completar el pago antes de que puedas aceptar',
        );
      }
    }

    return this.prisma.match.update({
      where: { id },
      data: {
        status: MatchStatus.ACCEPTED,
        startDate: startDate ? new Date(startDate) : match.startDate,
        endDate: endDate ? new Date(endDate) : match.endDate,
      },
      include: {
        experience: true,
        requester: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        host: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });
  }

  // Rechazar match (solo host)
  async reject(id: string, hostId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
    });

    if (!match) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    if (match.hostId !== hostId) {
      throw new ForbiddenException(
        'Solo el anfitrión puede rechazar solicitudes',
      );
    }

    if (match.status !== 'pending') {
      throw new BadRequestException('Esta solicitud ya no está pendiente');
    }

    // Reembolsar pago si existe
    if (match.paymentStatus === 'held' || match.paymentStatus === 'pending') {
      await this.paymentsService.refundPayment(
        id,
        'Solicitud rechazada por el anfitrión',
      );
    }

    return this.prisma.match.update({
      where: { id },
      data: { status: MatchStatus.REJECTED },
    });
  }

  // Cancelar match (solo requester si está pending, ambos si está accepted)
  async cancel(id: string, userId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
    });

    if (!match) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    // Solo el requester puede cancelar si está pending
    if (match.status === 'pending' && match.requesterId !== userId) {
      throw new ForbiddenException(
        'Solo quien solicitó puede cancelar una solicitud pendiente',
      );
    }

    // Ambos pueden cancelar si está accepted
    if (match.status === 'accepted') {
      if (match.hostId !== userId && match.requesterId !== userId) {
        throw new ForbiddenException(
          'No tienes permiso para cancelar esta solicitud',
        );
      }
    }

    if (match.status !== 'pending' && match.status !== 'accepted') {
      throw new BadRequestException('Esta solicitud no se puede cancelar');
    }

    // Reembolsar pago si existe
    if (match.paymentStatus === 'held' || match.paymentStatus === 'pending') {
      const reason =
        match.requesterId === userId
          ? 'Cancelado por el viajero'
          : 'Cancelado por el anfitrión';
      await this.paymentsService.refundPayment(id, reason);
    }

    return this.prisma.match.update({
      where: { id },
      data: { status: MatchStatus.CANCELLED },
    });
  }

  // Confirmar experiencia completada (sistema bidireccional)
  async confirmCompletion(id: string, userId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
    });

    if (!match) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    // Verificar que el usuario es parte del match
    const isHost = match.hostId === userId;
    const isRequester = match.requesterId === userId;

    if (!isHost && !isRequester) {
      throw new ForbiddenException('No tienes acceso a esta solicitud');
    }

    if (match.status !== 'accepted') {
      throw new BadRequestException(
        'Solo se pueden confirmar solicitudes aceptadas',
      );
    }

    // Verificar si ya confirmó
    if (isHost && match.hostConfirmed) {
      throw new BadRequestException('Ya has confirmado esta experiencia');
    }
    if (isRequester && match.requesterConfirmed) {
      throw new BadRequestException('Ya has confirmado esta experiencia');
    }

    // Actualizar confirmación
    const updateData: Record<string, boolean> = {};
    if (isHost) {
      updateData.hostConfirmed = true;
    } else {
      updateData.requesterConfirmed = true;
    }

    const updatedMatch = await this.prisma.match.update({
      where: { id },
      data: updateData,
    });

    // Verificar si ambos han confirmado
    const bothConfirmed =
      (isHost && updatedMatch.hostConfirmed && match.requesterConfirmed) ||
      (isRequester && match.hostConfirmed && updatedMatch.requesterConfirmed);

    if (bothConfirmed) {
      // Completar el match automáticamente
      return this.completeMatch(id);
    }

    return updatedMatch;
  }

  // Completar match internamente (cuando ambos confirman)
  private async completeMatch(id: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
    });

    if (!match) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    // Verificar saldo de ambos usuarios antes de completar
    const [hostHasBalance, requesterHasBalance] = await Promise.all([
      this.walletService.hasEnoughBalance(match.hostId),
      this.walletService.hasEnoughBalance(match.requesterId),
    ]);

    if (!hostHasBalance) {
      throw new BadRequestException(
        `El anfitrión no tiene saldo suficiente (${PLATFORM_FEE}€) para completar esta operación.`,
      );
    }

    if (!requesterHasBalance) {
      throw new BadRequestException(
        `El viajero no tiene saldo suficiente (${PLATFORM_FEE}€) para completar esta operación.`,
      );
    }

    // Descontar tarifa de plataforma a ambos usuarios
    await Promise.all([
      this.walletService.deductPlatformFee(match.hostId, id),
      this.walletService.deductPlatformFee(match.requesterId, id),
    ]);

    return this.prisma.match.update({
      where: { id },
      data: { status: MatchStatus.COMPLETED },
      include: {
        experience: true,
        requester: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        host: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });
  }

  // Marcar como completado (solo host después de accepted) - mantener para compatibilidad
  async complete(id: string, hostId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
    });

    if (!match) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    if (match.hostId !== hostId) {
      throw new ForbiddenException(
        'Solo el anfitrión puede marcar como completada',
      );
    }

    if (match.status !== 'accepted') {
      throw new BadRequestException(
        'Solo se pueden completar solicitudes aceptadas',
      );
    }

    // Verificar saldo de ambos usuarios antes de completar
    const [hostHasBalance, requesterHasBalance] = await Promise.all([
      this.walletService.hasEnoughBalance(match.hostId),
      this.walletService.hasEnoughBalance(match.requesterId),
    ]);

    if (!hostHasBalance) {
      throw new BadRequestException(
        `No tienes saldo suficiente. Necesitas ${PLATFORM_FEE}€ para completar esta operación. Recarga tu monedero.`,
      );
    }

    if (!requesterHasBalance) {
      throw new BadRequestException(
        `El viajero no tiene saldo suficiente (${PLATFORM_FEE}€) para completar esta operación.`,
      );
    }

    // Descontar tarifa de plataforma a ambos usuarios
    await Promise.all([
      this.walletService.deductPlatformFee(match.hostId, id),
      this.walletService.deductPlatformFee(match.requesterId, id),
    ]);

    return this.prisma.match.update({
      where: { id },
      data: { status: MatchStatus.COMPLETED },
    });
  }

  // Enviar mensaje en un match
  async sendMessage(matchId: string, senderId: string, content: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    // Verificar que el usuario es parte del match
    if (match.hostId !== senderId && match.requesterId !== senderId) {
      throw new ForbiddenException('No tienes acceso a esta conversación');
    }

    // No permitir mensajes si está rechazado o cancelado
    if (match.status === 'rejected' || match.status === 'cancelled') {
      throw new BadRequestException(
        'No puedes enviar mensajes en esta solicitud',
      );
    }

    const message = await this.prisma.message.create({
      data: {
        matchId,
        senderId,
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Actualizar updatedAt del match
    await this.prisma.match.update({
      where: { id: matchId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  // Contar mensajes no leídos
  async countUnreadMessages(userId: string) {
    return this.prisma.message.count({
      where: {
        match: {
          OR: [{ hostId: userId }, { requesterId: userId }],
        },
        senderId: { not: userId },
        read: false,
      },
    });
  }

  // Obtener estadísticas de matches
  async getStats(userId: string) {
    const [asHost, asRequester] = await Promise.all([
      this.prisma.match.groupBy({
        by: ['status'],
        where: { hostId: userId },
        _count: true,
      }),
      this.prisma.match.groupBy({
        by: ['status'],
        where: { requesterId: userId },
        _count: true,
      }),
    ]);

    return {
      asHost: asHost.reduce(
        (acc, item) => {
          acc[item.status] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      asRequester: asRequester.reduce(
        (acc, item) => {
          acc[item.status] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }
}
