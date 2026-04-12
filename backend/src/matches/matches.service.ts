import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { MatchStatus } from './dto/update-match.dto';
import { WalletService } from '../wallet/wallet.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PushService } from '../notifications/push.service';
import { PricingService } from '../experiences/pricing.service';
import {
  CancellationsService,
  RefundCalculation,
} from '../cancellations/cancellations.service';
import { EmailService } from '../email/email.service';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { ConfigService } from '@nestjs/config';
import { StripeIdempotencyService } from '../common/stripe-idempotency.service';
import { ConnectService } from '../connect/connect.service';
import { PaymentPlanService } from './payment-plan.service';
import Stripe from 'stripe';

// Helper para parsear fechas correctamente evitando problemas de zona horaria
function parseDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;

  // Si es formato YYYY-MM-DD, parsear como UTC mediodía
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }

  // Si es formato ISO completo, usar new Date directamente
  return new Date(dateStr);
}

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    private notificationsService: NotificationsService,
    private pushService: PushService,
    private pricingService: PricingService,
    private cancellationsService: CancellationsService,
    private emailService: EmailService,
    private configService: ConfigService,
    private stripeIdempotency: StripeIdempotencyService,
    private platformConfig: PlatformConfigService,
    private connectService: ConnectService,
    private paymentPlanService: PaymentPlanService,
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

    // Verificar si existe un match previo
    const existingMatch = await this.prisma.match.findUnique({
      where: {
        experienceId_requesterId: {
          experienceId: createDto.experienceId,
          requesterId,
        },
      },
    });

    if (existingMatch) {
      // Si está pendiente o aceptado, no permitir crear otro
      if (
        existingMatch.status === 'pending' ||
        existingMatch.status === 'accepted'
      ) {
        throw new ConflictException(
          'Ya tienes una solicitud activa para esta experiencia',
        );
      }

      // Si está en estado terminal (rejected/cancelled/completed), reactivar el match
      const reactivatedMatch = await this.prisma.match.update({
        where: { id: existingMatch.id },
        data: {
          status: 'pending',
          paymentStatus: null,
          hostConfirmed: false,
          requesterConfirmed: false,
          startDate: parseDate(createDto.startDate),
          endDate: parseDate(createDto.endDate),
          offerDescription: createDto.offerDescription || null,
          offerExperienceId: createDto.offerExperienceId || null,
          updatedAt: new Date(),
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

      // Crear mensaje inicial si se proporciona
      if (createDto.message) {
        await this.prisma.message.create({
          data: {
            matchId: reactivatedMatch.id,
            senderId: requesterId,
            content: createDto.message,
          },
        });
      }

      // Notificar al anfitrión de la nueva solicitud (reactivada)
      await Promise.all([
        this.notificationsService.notifyMatchRequest(
          experience.hostId,
          reactivatedMatch.id,
          reactivatedMatch.requester.name,
          experience.title,
        ),
        this.pushService.pushMatchRequest(
          experience.hostId,
          reactivatedMatch.requester.name,
          experience.title,
          reactivatedMatch.id,
        ),
      ]);

      return reactivatedMatch;
    }

    // Validar número de participantes
    const participants = createDto.participants || 1;
    const minParticipants = experience.minParticipants || 1;
    const maxParticipants =
      experience.maxParticipants || expWithCapacity?.capacity || 1;

    if (participants < minParticipants) {
      throw new BadRequestException(
        `El mínimo de participantes para esta experiencia es ${minParticipants}`,
      );
    }

    if (participants > maxParticipants) {
      throw new BadRequestException(
        `El máximo de participantes para esta experiencia es ${maxParticipants}`,
      );
    }

    // Calcular precio total si la experiencia es de pago
    let totalPrice: number | null = null;
    if (experience.type === 'pago' || experience.type === 'ambos') {
      const priceResult = await this.pricingService.calculateGroupPrice(
        createDto.experienceId,
        participants,
      );
      totalPrice = priceResult.totalPrice;
    }

    // Derivar startDate/endDate desde selectedDates si se envían
    const selectedDates = (createDto.selectedDates || [])
      .map((d) => parseDate(d) as Date)
      .filter((d) => d instanceof Date && !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (selectedDates.length > 0 && !createDto.startDate) {
      createDto.startDate = selectedDates[0].toISOString();
      if (selectedDates.length > 1) {
        createDto.endDate =
          selectedDates[selectedDates.length - 1].toISOString();
      }
    }

    // Verificar capacidad si hay fechas seleccionadas
    if (createDto.startDate) {
      const startDate = parseDate(createDto.startDate) as Date;
      const endDate = createDto.endDate
        ? (parseDate(createDto.endDate) as Date)
        : startDate;

      // Contar participantes en matches activos que se solapan con las fechas seleccionadas
      const overlappingMatches = await this.prisma.match.findMany({
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
        select: { participants: true },
      });

      const totalParticipantsBooked = overlappingMatches.reduce(
        (sum, m) => sum + (m.participants || 1),
        0,
      );

      if (
        totalParticipantsBooked + participants >
        (expWithCapacity?.capacity || 1)
      ) {
        const availableSpots =
          (expWithCapacity?.capacity || 1) - totalParticipantsBooked;
        throw new BadRequestException(
          availableSpots > 0
            ? `Solo quedan ${availableSpots} plazas disponibles para las fechas seleccionadas.`
            : 'No hay disponibilidad para las fechas seleccionadas. La experiencia está completa.',
        );
      }
    }

    // Validar experiencia ofrecida a cambio (intercambio)
    if (createDto.offerExperienceId) {
      const offerExp = await this.prisma.experience.findUnique({
        where: { id: createDto.offerExperienceId },
        select: { id: true, hostId: true, published: true },
      });
      if (!offerExp) {
        throw new BadRequestException('La experiencia ofrecida no existe');
      }
      if (offerExp.hostId !== requesterId) {
        throw new BadRequestException(
          'Solo puedes ofrecer tus propias experiencias a cambio',
        );
      }
      if (!offerExp.published) {
        throw new BadRequestException(
          'La experiencia ofrecida debe estar publicada',
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
        startDate: parseDate(createDto.startDate),
        endDate: parseDate(createDto.endDate),
        selectedDates,
        participants,
        participantNames: createDto.participantNames || [],
        totalPrice,
        offerDescription: createDto.offerDescription,
        offerExperienceId: createDto.offerExperienceId,
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

    // Notificar al anfitrión de la nueva solicitud
    await Promise.all([
      this.notificationsService.notifyMatchRequest(
        experience.hostId,
        match.id,
        match.requester.name,
        experience.title,
      ),
      this.pushService.pushMatchRequest(
        experience.hostId,
        match.requester.name,
        experience.title,
        match.id,
      ),
    ]);

    return match;
  }

  // Select común para listas de matches
  private matchListSelect(includeRequester: boolean) {
    return {
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
      participants: true,
      participantNames: true,
      totalPrice: true,
      offerDescription: true,
      offerExperienceId: true,
      offerExperience: {
        select: {
          id: true,
          title: true,
          type: true,
          city: true,
          photos: true,
        },
      },
      createdAt: true,
      updatedAt: true,
      experience: {
        select: {
          id: true,
          title: true,
          type: true,
          price: true,
          city: true,
          photos: true,
          depositEnabled: true,
          depositPercentage: true,
          balanceDaysBefore: true,
          festival: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      paymentPlan: {
        select: {
          id: true,
          totalAmount: true,
          depositAmount: true,
          balanceAmount: true,
          depositPaid: true,
          depositPaidAt: true,
          balanceDueDate: true,
          balancePaid: true,
          balancePaidAt: true,
          status: true,
        },
      },
      ...(includeRequester
        ? {
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
          }
        : {
            host: {
              select: {
                id: true,
                name: true,
                avatar: true,
                verified: true,
                city: true,
              },
            },
          }),
      messages: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          senderId: true,
        },
        orderBy: { createdAt: 'desc' as const },
        take: 1,
      },
      _count: {
        select: {
          messages: true,
        },
      },
    };
  }

  // Construir filtro de búsqueda
  private buildSearchFilter(search: string) {
    return {
      OR: [
        {
          experience: {
            title: { contains: search, mode: 'insensitive' as const },
          },
        },
        {
          experience: {
            city: { contains: search, mode: 'insensitive' as const },
          },
        },
        {
          experience: {
            festival: {
              name: { contains: search, mode: 'insensitive' as const },
            },
          },
        },
      ],
    };
  }

  // Obtener matches donde soy el host (solicitudes recibidas)
  async findReceivedMatches(
    hostId: string,
    status?: string,
    page?: number,
    limit?: number,
    search?: string,
  ) {
    const where: Record<string, unknown> = { hostId };
    if (status) {
      where.status = status;
    }
    if (search) {
      const searchFilter = this.buildSearchFilter(search);
      where.OR = searchFilter.OR;
    }

    // Si no hay paginación, devolver todo (retrocompatible)
    if (!page) {
      return this.prisma.match.findMany({
        where,
        select: this.matchListSelect(true),
        orderBy: { updatedAt: 'desc' },
      });
    }

    const take = Math.min(limit || 20, 50);
    const skip = (page - 1) * take;

    const [matches, total] = await Promise.all([
      this.prisma.match.findMany({
        where,
        select: this.matchListSelect(true),
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.match.count({ where }),
    ]);

    return {
      matches,
      pagination: {
        page,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
        hasMore: skip + matches.length < total,
      },
    };
  }

  // Obtener matches donde soy el requester (mis solicitudes)
  async findSentMatches(
    requesterId: string,
    status?: string,
    page?: number,
    limit?: number,
    search?: string,
  ) {
    const where: Record<string, unknown> = { requesterId };
    if (status) {
      where.status = status;
    }
    if (search) {
      const searchFilter = this.buildSearchFilter(search);
      where.OR = searchFilter.OR;
    }

    // Si no hay paginación, devolver todo (retrocompatible)
    if (!page) {
      return this.prisma.match.findMany({
        where,
        select: this.matchListSelect(false),
        orderBy: { updatedAt: 'desc' },
      });
    }

    const take = Math.min(limit || 20, 50);
    const skip = (page - 1) * take;

    const [matches, total] = await Promise.all([
      this.prisma.match.findMany({
        where,
        select: this.matchListSelect(false),
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.match.count({ where }),
    ]);

    return {
      matches,
      pagination: {
        page,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
        hasMore: skip + matches.length < total,
      },
    };
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
        offerExperience: {
          select: {
            id: true,
            title: true,
            type: true,
            city: true,
            photos: true,
            festival: { select: { id: true, name: true } },
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
            hasFriends: true,
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
            hasFriends: true,
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
        paymentPlan: true,
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
      include: {
        experience: true,
        host: { select: { name: true } },
        requester: { select: { name: true } },
      },
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

    // Si la experiencia tiene precio, el host debe tener Stripe Connect activo
    if (match.experience.price && match.experience.price > 0) {
      const connectStatus = await this.connectService.getAccountStatus(hostId);
      if (!connectStatus.payoutsEnabled) {
        throw new BadRequestException(
          'Para aceptar experiencias de pago, debes configurar tu cuenta de cobros. Ve a tu perfil > Cuenta de cobros.',
        );
      }
    }

    // Verificar créditos de ambos usuarios antes de aceptar
    const [hostHasCredits, requesterHasCredits] = await Promise.all([
      this.walletService.hasEnoughCredits(match.hostId),
      this.walletService.hasEnoughCredits(match.requesterId),
    ]);

    if (!hostHasCredits) {
      throw new BadRequestException(
        `No tienes experiencias disponibles. Compra un pack para cerrar el acuerdo.`,
      );
    }

    if (!requesterHasCredits) {
      throw new BadRequestException(
        `El viajero no tiene experiencias disponibles para cerrar el acuerdo.`,
      );
    }

    // Cobrar tarifa de plataforma a ambos usuarios al cerrar el acuerdo
    const experienceTitle = match.experience.title;
    const hostName = match.host.name;
    const requesterName = match.requester.name;
    await Promise.all([
      this.walletService.deductPlatformFee(
        match.hostId,
        id,
        experienceTitle,
        'host',
        match.requesterId,
        requesterName,
      ),
      this.walletService.deductPlatformFee(
        match.requesterId,
        id,
        experienceTitle,
        'guest',
        match.hostId,
        hostName,
      ),
    ]);

    // Obtener saldos actualizados
    const [hostWallet, requesterWallet] = await Promise.all([
      this.walletService.getWallet(match.hostId),
      this.walletService.getWallet(match.requesterId),
    ]);

    // Enviar notificaciones de cargo a ambos usuarios
    const hostOperationsLeft = Math.floor(
      hostWallet.balance / this.platformConfig.platformFee,
    );
    const requesterOperationsLeft = Math.floor(
      requesterWallet.balance / this.platformConfig.platformFee,
    );

    await Promise.all([
      // Notificaciones al anfitrión
      this.notificationsService.notifyWalletCharged(
        match.hostId,
        this.platformConfig.platformFee,
        experienceTitle,
        id,
        hostWallet.balance,
      ),
      this.pushService.pushWalletCharged(
        match.hostId,
        this.platformConfig.platformFee,
        experienceTitle,
        id,
        hostWallet.balance,
      ),
      // Notificaciones al viajero
      this.notificationsService.notifyWalletCharged(
        match.requesterId,
        this.platformConfig.platformFee,
        experienceTitle,
        id,
        requesterWallet.balance,
      ),
      this.pushService.pushWalletCharged(
        match.requesterId,
        this.platformConfig.platformFee,
        experienceTitle,
        id,
        requesterWallet.balance,
      ),
      // Notificación de match aceptado al viajero
      this.notificationsService.notifyMatchAccepted(
        match.requesterId,
        id,
        hostName,
        experienceTitle,
      ),
      this.pushService.pushMatchAccepted(
        match.requesterId,
        hostName,
        experienceTitle,
        id,
      ),
    ]);

    // Verificar saldo bajo y notificar si es necesario
    if (hostOperationsLeft <= 1) {
      await Promise.all([
        this.notificationsService.notifyLowBalance(
          match.hostId,
          hostWallet.balance,
          hostOperationsLeft,
        ),
        this.pushService.pushLowBalance(
          match.hostId,
          hostWallet.balance,
          hostOperationsLeft,
        ),
      ]);
    }
    if (requesterOperationsLeft <= 1) {
      await Promise.all([
        this.notificationsService.notifyLowBalance(
          match.requesterId,
          requesterWallet.balance,
          requesterOperationsLeft,
        ),
        this.pushService.pushLowBalance(
          match.requesterId,
          requesterWallet.balance,
          requesterOperationsLeft,
        ),
      ]);
    }

    // Si la experiencia tiene precio, marcar como pendiente de pago
    const hasTotalPrice = match.totalPrice && match.totalPrice > 0;
    const paymentStatus = hasTotalPrice ? 'pending_payment' : null;

    return this.prisma.match.update({
      where: { id },
      data: {
        status: MatchStatus.ACCEPTED,
        paymentStatus,
        startDate: startDate ? parseDate(startDate) : match.startDate,
        endDate: endDate ? parseDate(endDate) : match.endDate,
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

  // Crear pago de experiencia con Stripe Checkout usando Destination Charges
  // - immediate: captura automática, fondos al host en el momento (refund vía Stripe 180 días)
  // - escrow: captura manual hasta 7 días; si la experiencia es posterior, se fuerza immediate
  // - deposit: pago en dos plazos (depósito ahora + saldo off-session en balanceDueDate)
  // El host es merchant of record (on_behalf_of). Precios con IVA incluido.
  async createExperiencePayment(
    matchId: string,
    requesterId: string,
    paymentMode: 'immediate' | 'escrow' | 'deposit' = 'escrow',
  ) {
    // Modo deposit: delegar al servicio especializado
    if (paymentMode === 'deposit') {
      return this.paymentPlanService.createDepositCheckout(
        matchId,
        requesterId,
      );
    }

    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        experience: { select: { title: true } },
        host: {
          select: {
            stripeConnectAccountId: true,
            stripeConnectPayoutsEnabled: true,
          },
        },
      },
    });

    if (!match) throw new NotFoundException('Solicitud no encontrada');
    if (match.requesterId !== requesterId) {
      throw new ForbiddenException('Solo el viajero puede realizar el pago');
    }
    if (
      match.status !== 'accepted' ||
      match.paymentStatus !== 'pending_payment'
    ) {
      throw new BadRequestException('Esta solicitud no requiere pago');
    }
    if (!match.totalPrice || match.totalPrice <= 0) {
      throw new BadRequestException('Esta experiencia no tiene precio');
    }

    // El host debe tener Stripe Connect activo (obligatorio para Destination Charges)
    if (
      !match.host.stripeConnectAccountId ||
      !match.host.stripeConnectPayoutsEnabled
    ) {
      throw new BadRequestException(
        'El anfitrión aún no ha configurado su cuenta de cobros. No se puede procesar el pago.',
      );
    }

    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new BadRequestException(
        'Pagos no configurados. Contacta al administrador.',
      );
    }
    const stripe = new Stripe(stripeKey);

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const amountInCents = Math.round(match.totalPrice * 100);

    // Determinar si se puede usar captura manual (hold):
    // Stripe solo permite autorizaciones hasta 7 días. Si la experiencia es posterior,
    // forzamos captura automática (immediate) — no hay forma legal de retener más tiempo.
    const daysUntilExperience = match.startDate
      ? Math.ceil(
          (new Date(match.startDate).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;
    const canHold =
      paymentMode === 'escrow' &&
      daysUntilExperience > 0 &&
      daysUntilExperience <= 7;
    const captureMethod: 'manual' | 'automatic' = canHold
      ? 'manual'
      : 'automatic';
    const escrowLabel = canHold ? 'hold' : 'immediate';

    const description = canHold
      ? 'Pago experiencia FiestApp - Retenido hasta confirmar (IVA incluido)'
      : 'Pago experiencia FiestApp - Pago directo (IVA incluido)';

    // Crear Stripe Checkout Session con Destination Charge
    // on_behalf_of + transfer_data hace que el host sea merchant of record
    // Sin application_fee_amount porque las comisiones se cobran vía créditos
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: match.experience.title,
              description,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        matchId,
        requesterId,
        type: 'experience_payment',
        paymentMode,
        escrowMode: escrowLabel,
      },
      payment_intent_data: {
        capture_method: captureMethod,
        on_behalf_of: match.host.stripeConnectAccountId,
        transfer_data: {
          destination: match.host.stripeConnectAccountId,
        },
        metadata: {
          matchId,
          requesterId,
          type: 'experience_payment',
          paymentMode,
        },
      },
      success_url: `${frontendUrl}/matches/payment-result?status=success&session_id={CHECKOUT_SESSION_ID}&matchId=${matchId}`,
      cancel_url: `${frontendUrl}/matches/payment-result?status=error&matchId=${matchId}`,
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    await this.prisma.transaction.create({
      data: {
        userId: requesterId,
        matchId,
        type: 'experience_payment',
        amount: -match.totalPrice,
        status: 'pending',
        stripeId: session.id,
        description: `Pago experiencia: ${match.experience.title} [${escrowLabel}]`,
      },
    });

    return {
      sessionUrl: session.url,
      sessionId: session.id,
    };
  }

  // Procesar webhook de Stripe para pago de experiencia
  async handleExperiencePaymentWebhook(event: Stripe.Event): Promise<void> {
    if (event.type !== 'checkout.session.completed') {
      return;
    }

    const session = event.data.object;

    // Solo procesar eventos de experience_payment
    if (session.metadata?.type !== 'experience_payment') {
      return;
    }

    // Idempotencia: evitar procesar el mismo evento dos veces
    if (await this.stripeIdempotency.isAlreadyProcessed(event.id, event.type)) {
      return;
    }

    const sessionId = session.id;

    const transaction = await this.prisma.transaction.findFirst({
      where: { stripeId: sessionId, type: 'experience_payment' },
    });

    if (!transaction || !transaction.matchId) return;
    if (
      transaction.status === 'held' ||
      transaction.status === 'completed' ||
      transaction.status === 'released'
    )
      return;

    if (session.payment_status === 'paid') {
      const paymentIntentId = session.payment_intent as string;
      const escrowMode = session.metadata?.escrowMode || 'immediate';

      // Con Destination Charges el dinero ya está en la cuenta conectada del host
      // (o autorizado si es 'hold'). No hay Transfer separado.
      const newStatus = escrowMode === 'hold' ? 'held' : 'released';

      await this.prisma.$transaction(async (tx) => {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: newStatus,
            stripeId: paymentIntentId || transaction.stripeId,
          },
        });
        await tx.match.update({
          where: { id: transaction.matchId! },
          data: { paymentStatus: newStatus },
        });
      });

      this.logger.log(
        `Experience payment ${newStatus} for match ${transaction.matchId} (mode=${escrowMode}, via destination charge)`,
      );
    } else {
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'cancelled' },
      });
    }
  }

  // Verificar estado del pago de experiencia
  // Si el webhook no ha llegado, verifica directamente con Stripe
  async getPaymentStatus(matchId: string, userId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: {
        paymentStatus: true,
        totalPrice: true,
        requesterId: true,
        hostId: true,
      },
    });

    if (!match) throw new NotFoundException('Solicitud no encontrada');
    if (match.requesterId !== userId && match.hostId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta solicitud');
    }

    // Si aún está pending_payment, verificar directamente con Stripe (por si el webhook no llegó)
    if (match.paymentStatus === 'pending_payment') {
      const transaction = await this.prisma.transaction.findFirst({
        where: { matchId, type: 'experience_payment', status: 'pending' },
      });

      if (transaction?.stripeId) {
        try {
          const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
          if (stripeKey) {
            const stripe = new Stripe(stripeKey);
            const isSession = transaction.stripeId.startsWith('cs_');
            let paymentIntentId = transaction.stripeId;

            if (isSession) {
              const session = await stripe.checkout.sessions.retrieve(
                transaction.stripeId,
              );
              paymentIntentId = session.payment_intent as string;
            }

            if (paymentIntentId) {
              const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

              if (
                pi.status === 'requires_capture' ||
                pi.status === 'succeeded'
              ) {
                // Con Destination Charges: 'requires_capture' = hold, 'succeeded' = released
                // El dinero ya está en la cuenta del host (o autorizado).
                const newStatus =
                  pi.status === 'requires_capture' ? 'held' : 'released';

                await this.prisma.$transaction(async (tx) => {
                  await tx.transaction.update({
                    where: { id: transaction.id },
                    data: { status: newStatus, stripeId: paymentIntentId },
                  });
                  await tx.match.update({
                    where: { id: matchId },
                    data: { paymentStatus: newStatus },
                  });
                });

                return { paymentStatus: newStatus, amount: match.totalPrice };
              }
            }
          }
        } catch (error) {
          this.logger.warn(
            `Stripe verification failed for match ${matchId}: ${error}`,
          );
        }
      }
    }

    return {
      paymentStatus: match.paymentStatus,
      amount: match.totalPrice,
    };
  }

  // Rechazar match (solo host)
  async reject(id: string, hostId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: {
        experience: { select: { title: true } },
      },
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

    const updatedMatch = await this.prisma.match.update({
      where: { id },
      data: { status: MatchStatus.REJECTED },
    });

    // Notificar al viajero del rechazo
    await this.notificationsService.notifyMatchRejected(
      match.requesterId,
      id,
      match.experience.title,
    );

    return updatedMatch;
  }

  // Cancelar match (solo requester si está pending, ambos si está accepted)
  async cancel(id: string, userId: string, reason?: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: {
        experience: {
          select: {
            title: true,
            city: true,
            cancellationPolicy: true,
          },
        },
        host: { select: { id: true, name: true, email: true } },
        requester: { select: { id: true, name: true, email: true } },
      },
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

    // Verificar si el usuario tiene demasiadas cancelaciones recientes
    const cancellationWarning =
      await this.cancellationsService.getCancellationWarning(userId);
    if (!cancellationWarning.canCancel) {
      throw new BadRequestException(
        cancellationWarning.message ||
          'Has alcanzado el límite de cancelaciones. Contacta con soporte.',
      );
    }

    const isHost = userId === match.hostId;
    const cancelledByHost = isHost;

    // Calcular reembolso si hay pago y fecha de inicio
    let refundAmount = 0;
    let refundPercentage = 0;

    if (match.status === 'accepted' && match.totalPrice && match.startDate) {
      // Si el host cancela, reembolso total al viajero
      if (cancelledByHost) {
        refundPercentage = 100;
        refundAmount = match.totalPrice;

        // Registrar cancelación del anfitrión
        const hoursUntilStart =
          (match.startDate.getTime() - Date.now()) / (1000 * 60 * 60);
        const hostRefundCalc: RefundCalculation = {
          refundPercentage: 100,
          refundAmount: match.totalPrice,
          penaltyAmount: 0,
          policy: match.experience.cancellationPolicy,
          hoursUntilStart: Math.max(0, hoursUntilStart),
        };
        await this.cancellationsService.recordCancellation(
          id,
          userId,
          reason,
          hostRefundCalc,
          'host',
        );

        // Verificar y penalizar si tiene demasiadas cancelaciones
        await this.cancellationsService.checkAndPenalizeHost(userId);
      } else {
        // Si el viajero cancela, aplicar política de cancelación
        const refundCalc = this.cancellationsService.calculateRefund(
          match.experience.cancellationPolicy,
          match.totalPrice,
          match.startDate,
        );
        refundAmount = refundCalc.refundAmount;
        refundPercentage = refundCalc.refundPercentage;

        // Registrar cancelación en base de datos
        await this.cancellationsService.recordCancellation(
          id,
          userId,
          reason,
          refundCalc,
          'requester',
        );
      }

      // Si hay un PaymentPlan (reserva con depósito), delegar al servicio especializado
      const paymentPlan = await this.prisma.paymentPlan.findUnique({
        where: { matchId: id },
      });
      if (paymentPlan && refundAmount > 0) {
        await this.paymentPlanService.cancelPlan(id, refundPercentage);
      }

      // Procesar reembolso según estado del pago (incluye 'released' para pagos inmediatos)
      if (
        !paymentPlan &&
        (match.paymentStatus === 'held' ||
          match.paymentStatus === 'paid' ||
          match.paymentStatus === 'released') &&
        refundAmount > 0
      ) {
        const paymentTx = await this.prisma.transaction.findFirst({
          where: {
            matchId: id,
            type: 'experience_payment',
            status: { in: ['held', 'completed', 'released'] },
          },
        });

        if (paymentTx?.stripeId) {
          let isStripeHold =
            paymentTx.description?.includes('[stripe_hold]') || false;
          try {
            const stripeKey =
              this.configService.get<string>('STRIPE_SECRET_KEY');
            if (stripeKey) {
              const stripe = new Stripe(stripeKey);
              const paymentIntent = await stripe.paymentIntents.retrieve(
                paymentTx.stripeId,
              );
              isStripeHold = paymentIntent.status === 'requires_capture';

              if (isStripeHold) {
                // Stripe hold (< 7 días): cancelar o capturar parcialmente (sin coste)
                if (refundPercentage === 100) {
                  await stripe.paymentIntents.cancel(paymentTx.stripeId);
                } else {
                  const captureAmount = Math.round(
                    (match.totalPrice - refundAmount) * 100,
                  );
                  if (captureAmount > 0) {
                    await stripe.paymentIntents.capture(paymentTx.stripeId, {
                      amount_to_capture: captureAmount,
                    });
                  } else {
                    await stripe.paymentIntents.cancel(paymentTx.stripeId);
                  }
                }
              } else if (paymentIntent.status === 'succeeded') {
                // Platform hold (>= 7 días): reembolso estándar
                // Stripe no devuelve su comisión, se reembolsa el monto completo al viajero
                // pero la diferencia (comisión Stripe) se pierde y se registra en la transacción
                await stripe.refunds.create({
                  payment_intent: paymentTx.stripeId,
                  amount: Math.round(refundAmount * 100),
                  reason: 'requested_by_customer',
                });
              }
            }

            // Registrar reembolso: el importe es lo que Stripe devuelve al viajero
            // En stripe_hold no hay comisión Stripe (cancelación gratuita)
            // En platform_hold, Stripe no devuelve su comisión → es un coste para la plataforma
            const stripeFeeOnRefund = isStripeHold
              ? 0
              : this.platformConfig.calculateStripeFee(refundAmount);

            // Transacción de reembolso: registrar el importe REAL devuelto al viajero
            await this.prisma.transaction.create({
              data: {
                userId: match.requesterId,
                matchId: id,
                type: 'refund',
                amount: refundAmount,
                status: 'completed',
                description: `Devolución por cancelación: ${match.experience.title}`,
              },
            });

            // Si hay comisión Stripe perdida, registrarla como gasto de plataforma
            if (stripeFeeOnRefund > 0) {
              await this.prisma.transaction.create({
                data: {
                  userId: match.requesterId,
                  matchId: id,
                  type: 'platform_fee',
                  amount: -stripeFeeOnRefund,
                  status: 'completed',
                  description: `Comisión procesador de pagos no recuperable: ${match.experience.title}`,
                },
              });
            }

            await this.prisma.transaction.update({
              where: { id: paymentTx.id },
              data: { status: 'refunded' },
            });

            // Devolver comisión solo al usuario que NO canceló.
            // Quien cancela pierde su comisión (se usa para cubrir la devolución al otro).
            if (isHost) {
              // Anfitrión cancela: pierde su 1,50€, se devuelve al viajero
              await this.walletService.refundPlatformFee(match.requesterId, id);
            } else {
              // Viajero cancela: pierde su 1,50€, se devuelve al anfitrión
              await this.walletService.refundPlatformFee(match.hostId, id);
            }
          } catch (error) {
            this.logger.error(`Refund failed for match ${id}:`, error);
          }
        }
      } else if (match.paymentStatus === 'pending_payment') {
        // No pagó aún: quien cancela pierde su comisión, el otro la recupera
        if (isHost) {
          await this.walletService.refundPlatformFee(match.requesterId, id);
        } else {
          await this.walletService.refundPlatformFee(match.hostId, id);
        }
      } else if (refundAmount > 0) {
        // Fallback: reembolso al wallet
        await this.walletService.addBalance(
          match.requesterId,
          refundAmount,
          `Reembolso por cancelación: ${match.experience.title}`,
          id,
        );
      }
    }

    // Actualizar estado del match
    const updatedMatch = await this.prisma.match.update({
      where: { id },
      data: {
        status: MatchStatus.CANCELLED,
        paymentStatus: refundAmount > 0 ? 'refunded' : match.paymentStatus,
      },
    });

    // Notificar a la otra parte
    const otherUserId = isHost ? match.requesterId : match.hostId;
    const otherUser = isHost ? match.requester : match.host;
    const cancelledByName = isHost ? match.host.name : match.requester.name;

    // Enviar notificación in-app
    await this.notificationsService.create({
      userId: otherUserId,
      type: 'match_cancelled',
      title: 'Reserva cancelada',
      message: `${cancelledByName} ha cancelado la reserva para "${match.experience.title}"`,
      data: {
        matchId: id,
        refundAmount,
        refundPercentage,
      },
    });

    // Enviar email de cancelación
    await this.emailService.sendMatchCancelledEmail(
      otherUser.email,
      otherUser.name,
      cancelledByName,
      match.experience.title,
      match.experience.city,
      match.startDate || new Date(),
      cancelledByHost,
      reason,
      refundAmount,
      refundPercentage,
    );

    return {
      ...updatedMatch,
      refundAmount,
      refundPercentage,
    };
  }

  // Confirmar experiencia completada (sistema bidireccional)
  async confirmCompletion(id: string, userId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: {
        experience: { select: { title: true } },
        host: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true } },
      },
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

    // Verificar que la fecha de la experiencia ya ha pasado o es hoy (#87)
    const matchDate = match.startDate ? new Date(match.startDate) : null;
    const now = new Date();
    if (matchDate) {
      // Comparar solo por fecha (sin hora) para permitir confirmar el mismo día
      const matchDay = new Date(
        matchDate.getFullYear(),
        matchDate.getMonth(),
        matchDate.getDate(),
      );
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (matchDay > today) {
        throw new BadRequestException(
          'No puedes confirmar la experiencia antes de que haya tenido lugar',
        );
      }
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
      // Notificar a ambos que la experiencia se ha completado
      const completedMatch = await this.completeMatch(id);

      await Promise.all([
        this.notificationsService.create({
          userId: match.hostId,
          type: 'match_completed',
          title: 'Experiencia completada',
          message: `La experiencia "${match.experience.title}" ha sido completada por ambas partes`,
          data: { matchId: id },
        }),
        this.notificationsService.create({
          userId: match.requesterId,
          type: 'match_completed',
          title: 'Experiencia completada',
          message: `La experiencia "${match.experience.title}" ha sido completada por ambas partes`,
          data: { matchId: id },
        }),
      ]);

      return completedMatch;
    }

    // Notificar al otro usuario que uno ha confirmado
    const otherUserId = isHost ? match.requesterId : match.hostId;
    const confirmerName = isHost ? match.host.name : match.requester.name;

    await this.notificationsService.create({
      userId: otherUserId,
      type: 'match_confirmed',
      title: 'Confirmación recibida',
      message: `${confirmerName} ha confirmado la experiencia "${match.experience.title}". Confirma tú también para completarla.`,
      data: { matchId: id },
    });

    return updatedMatch;
  }

  // Completar match internamente (cuando ambos confirman)
  private async completeMatch(id: string) {
    const match = await this.prisma.match.update({
      where: { id },
      data: { status: MatchStatus.COMPLETED },
      include: {
        experience: true,
        requester: {
          select: { id: true, name: true, avatar: true },
        },
        host: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    // Liberar escrow: capturar pago retenido y transferir al host
    await this.releaseEscrow(id, match.hostId);

    return match;
  }

  /**
   * Libera el pago retenido (escrow con captura manual).
   * Con Destination Charges: solo hay que capturar el PaymentIntent, el dinero
   * va automáticamente a la cuenta conectada del host (on_behalf_of + transfer_data).
   */
  private async releaseEscrow(matchId: string, hostId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { matchId, status: 'held', type: 'experience_payment' },
    });

    if (!transaction?.stripeId) return; // No hay pago retenido (intercambio gratuito)

    try {
      const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
      if (stripeKey) {
        const stripe = new Stripe(stripeKey);
        const pi = await stripe.paymentIntents.retrieve(transaction.stripeId);
        if (pi.status === 'requires_capture') {
          await stripe.paymentIntents.capture(transaction.stripeId);
        }
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: { status: 'released' },
        });
        await tx.match.update({
          where: { id: matchId },
          data: { paymentStatus: 'released' },
        });
      });

      this.logger.log(
        `Escrow released (destination charge captured) for match ${matchId} → host ${hostId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to release escrow for match ${matchId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  // Marcar como completado (solo host después de accepted)
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

    // Verificar que la fecha de la experiencia ya ha pasado o es hoy (#87)
    const matchDate = match.startDate ? new Date(match.startDate) : null;
    const now = new Date();
    if (matchDate) {
      const matchDay = new Date(
        matchDate.getFullYear(),
        matchDate.getMonth(),
        matchDate.getDate(),
      );
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (matchDay > today) {
        throw new BadRequestException(
          'No puedes completar la experiencia antes de que haya tenido lugar',
        );
      }
    }

    // El cobro ya se realizó al aceptar el acuerdo
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

    // Verificar que el usuario tiene créditos suficientes
    const hasCredits = await this.walletService.hasEnoughCredits(senderId);
    if (!hasCredits) {
      throw new BadRequestException(
        `Necesitas experiencias disponibles para usar el chat. Compra un pack.`,
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
