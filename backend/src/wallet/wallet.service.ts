import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StripeIdempotencyService } from '../common/stripe-idempotency.service';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import Stripe from 'stripe';

export type TransactionType = 'pack_purchase' | 'platform_fee' | 'refund';

@Injectable()
export class WalletService implements OnModuleInit {
  private readonly logger = new Logger(WalletService.name);
  private frontendUrl: string;
  private stripe: Stripe | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private stripeIdempotency: StripeIdempotencyService,
    private platformConfig: PlatformConfigService,
  ) {
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey);
    } else {
      this.logger.warn(
        'STRIPE_SECRET_KEY not configured - wallet top-ups disabled',
      );
    }
  }

  /**
   * Migración automática: convierte balance legacy (euros) a credits.
   * Se ejecuta una sola vez al arrancar. Los wallets con balance > 0 y credits = 0
   * reciben credits equivalentes (balance / platformFee, redondeado hacia abajo).
   */
  async onModuleInit() {
    try {
      const fee = this.platformConfig.platformFee;
      const walletsToMigrate = await this.prisma.wallet.findMany({
        where: { balance: { gt: 0 }, credits: 0 },
      });

      if (walletsToMigrate.length === 0) return;

      for (const wallet of walletsToMigrate) {
        const newCredits = Math.max(1, Math.floor(wallet.balance / fee));
        await this.prisma.wallet.update({
          where: { id: wallet.id },
          data: { credits: newCredits, balance: 0 },
        });
        this.logger.log(
          `Migrated wallet ${wallet.userId}: ${wallet.balance}€ → ${newCredits} credits`,
        );
      }

      this.logger.log(
        `Balance-to-credits migration: ${walletsToMigrate.length} wallets migrated`,
      );
    } catch (error) {
      this.logger.warn(
        `Balance migration failed (non-critical): ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private ensureStripe(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException(
        'Pagos no configurados. Contacta al administrador.',
      );
    }
    return this.stripe;
  }

  // Obtener monedero del usuario
  async getWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      // Crear monedero si no existe (para usuarios antiguos)
      return this.prisma.wallet.create({
        data: { userId, balance: 0 },
      });
    }

    // Migración on-the-fly: si el usuario tiene balance legacy en euros pero
    // 0 créditos, lo convertimos automáticamente la primera vez que lo consultamos.
    // Esto cubre el caso de usuarios que existen pero la app nunca se reinició
    // tras el deploy del nuevo sistema de packs.
    if (wallet.balance > 0 && wallet.credits === 0) {
      const fee = this.platformConfig.platformFee;
      const newCredits = Math.max(1, Math.floor(wallet.balance / fee));
      const migrated = await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { credits: newCredits, balance: 0 },
      });
      this.logger.log(
        `On-the-fly migrated wallet ${userId}: ${wallet.balance}€ → ${newCredits} credits`,
      );
      return migrated;
    }

    return wallet;
  }

  // Obtener saldo
  async getBalance(userId: string): Promise<number> {
    const wallet = await this.getWallet(userId);
    return wallet.balance;
  }

  // Verificar si tiene créditos de experiencia suficientes
  async hasEnoughCredits(userId: string): Promise<boolean> {
    const wallet = await this.getWallet(userId);
    return wallet.credits >= 1;
  }

  // Crear sesión de Stripe Checkout para compra de pack
  async createPackPurchaseSession(
    userId: string,
    packId: string,
    returnTo?: string,
  ): Promise<{ sessionUrl: string; sessionId: string }> {
    const pack = this.platformConfig.getPack(packId);
    if (!pack) {
      throw new BadRequestException(`Pack no válido: ${packId}`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Cancelar compras pendientes antiguas
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    await this.prisma.transaction.updateMany({
      where: {
        userId,
        type: 'pack_purchase',
        status: 'pending',
        createdAt: { lt: thirtyMinutesAgo },
      },
      data: { status: 'cancelled' },
    });

    // Usar Stripe Price ID fijo si está configurado, sino fallback a price_data dinámico
    const stripePriceId = this.platformConfig.getStripePriceId(pack.id);
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      stripePriceId
        ? [{ price: stripePriceId, quantity: 1 }]
        : [
            {
              price_data: {
                currency: 'eur',
                product_data: {
                  name: `Pack ${pack.name}`,
                  description: `${pack.experiences} experiencias${pack.bonus > 0 ? ` (${pack.bonus} gratis)` : ''}`,
                },
                unit_amount: Math.round(pack.price * 100),
              },
              quantity: 1,
            },
          ];

    const session = await this.ensureStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      metadata: {
        userId,
        type: 'pack_purchase',
        packId: pack.id,
        credits: pack.experiences.toString(),
        walletAmount: pack.price.toString(),
      },
      success_url: returnTo
        ? `${this.frontendUrl}/wallet/topup-result?status=success&session_id={CHECKOUT_SESSION_ID}&returnTo=${encodeURIComponent(returnTo)}`
        : `${this.frontendUrl}/wallet/topup-result?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: returnTo
        ? `${this.frontendUrl}/wallet/topup-result?status=error&returnTo=${encodeURIComponent(returnTo)}`
        : `${this.frontendUrl}/wallet/topup-result?status=error`,
    });

    await this.prisma.transaction.create({
      data: {
        userId,
        type: 'pack_purchase',
        amount: pack.price,
        creditsAmount: pack.experiences,
        packId: pack.id,
        status: 'pending',
        stripeId: session.id,
        description: `Pack ${pack.name}: ${pack.experiences} experiencias`,
      },
    });

    this.logger.debug(
      `Pack purchase session created: sessionId=${session.id}, pack=${pack.id}, price=${pack.price}€, credits=${pack.experiences}, user=${userId}`,
    );

    return { sessionUrl: session.url!, sessionId: session.id };
  }

  // Procesar webhook de Stripe para compras de pack
  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    if (event.type !== 'checkout.session.completed') {
      return;
    }

    const session = event.data.object;

    // Solo procesar eventos de pack_purchase
    if (session.metadata?.type !== 'pack_purchase') {
      return;
    }

    // Idempotencia: evitar procesar el mismo evento dos veces
    if (await this.stripeIdempotency.isAlreadyProcessed(event.id, event.type)) {
      return;
    }

    const sessionId = session.id;

    this.logger.log(`Stripe wallet webhook: session=${sessionId}`);

    const transaction = await this.prisma.transaction.findFirst({
      where: { stripeId: sessionId, type: 'pack_purchase' },
    });

    if (!transaction) {
      this.logger.warn(`Transaction not found for session: ${sessionId}`);
      return;
    }

    if (transaction.status === 'completed') {
      this.logger.debug(`Transaction already completed: ${sessionId}`);
      return;
    }

    if (session.payment_status === 'paid') {
      // Pago exitoso - añadir créditos del pack
      await this.prisma.$transaction(async (tx) => {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: { status: 'completed' },
        });

        if (transaction.creditsAmount) {
          await tx.wallet.upsert({
            where: { userId: transaction.userId },
            update: { credits: { increment: transaction.creditsAmount } },
            create: {
              userId: transaction.userId,
              balance: 0,
              credits: transaction.creditsAmount,
            },
          });
        }
      });

      this.logger.log(
        `Pack purchase completed: session=${sessionId}, credits=${transaction.creditsAmount}, user=${transaction.userId}`,
      );
    } else {
      // Pago fallido
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'cancelled' },
      });

      this.logger.warn(
        `TopUp failed: session=${sessionId}, status=${session.payment_status}`,
      );
    }
  }

  // Verificar resultado de compra de pack (llamado desde el frontend al volver de Stripe)
  async checkPurchaseResult(
    sessionId: string,
    userId: string,
  ): Promise<{
    success: boolean;
    amount?: number;
    credits?: number;
    packId?: string;
  }> {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        stripeId: sessionId,
        type: 'pack_purchase',
        userId,
      },
    });

    if (!transaction) {
      return { success: false };
    }

    // Si aún está pendiente, verificar directamente con Stripe
    if (transaction.status === 'pending') {
      try {
        const session =
          await this.ensureStripe().checkout.sessions.retrieve(sessionId);
        if (session.payment_status === 'paid') {
          // El webhook aún no llegó, pero el pago sí se completó
          await this.prisma.$transaction(async (tx) => {
            await tx.transaction.update({
              where: { id: transaction.id },
              data: { status: 'completed' },
            });

            if (transaction.creditsAmount) {
              await tx.wallet.upsert({
                where: { userId: transaction.userId },
                update: { credits: { increment: transaction.creditsAmount } },
                create: {
                  userId: transaction.userId,
                  balance: 0,
                  credits: transaction.creditsAmount,
                },
              });
            }
          });

          return {
            success: true,
            amount: transaction.amount,
            credits: transaction.creditsAmount ?? undefined,
            packId: transaction.packId ?? undefined,
          };
        }
      } catch {
        // Si falla la verificación, devolver el estado actual de BD
      }
    }

    return {
      success: transaction.status === 'completed',
      amount: transaction.amount,
      credits: transaction.creditsAmount ?? undefined,
      packId: transaction.packId ?? undefined,
    };
  }

  // Añadir saldo al monedero (para reembolsos)
  async addBalance(
    userId: string,
    amount: number,
    description: string,
    matchId?: string,
  ): Promise<void> {
    if (amount <= 0) {
      throw new BadRequestException('El monto debe ser positivo');
    }

    await this.prisma.$transaction(async (tx) => {
      // Añadir al monedero
      await tx.wallet.upsert({
        where: { userId },
        update: { balance: { increment: amount } },
        create: { userId, balance: amount },
      });

      // Registrar transacción de reembolso
      await tx.transaction.create({
        data: {
          userId,
          matchId,
          type: 'refund',
          amount,
          status: 'completed',
          description,
        },
      });
    });

    this.logger.log(`Reembolso de ${amount}€ añadido a usuario ${userId}`);
  }

  // Descontar tarifa de plataforma (llamado al cerrar acuerdo)
  // Requiere créditos de pack
  async deductPlatformFee(
    userId: string,
    matchId: string,
    experienceTitle: string,
    role: 'host' | 'guest',
    otherUserId: string,
    otherUserName: string,
  ): Promise<void> {
    const wallet = await this.getWallet(userId);

    if (wallet.credits < 1) {
      throw new BadRequestException(
        `No tienes experiencias disponibles. Compra un pack para continuar.`,
      );
    }

    const description =
      role === 'host'
        ? `${experienceTitle} · ${otherUserName}`
        : `${experienceTitle} · con ${otherUserName}`;

    // Registrar amount = -platformFee (negativo porque es coste para el usuario)
    // aunque se pague con créditos. Esto da visibilidad fiscal: las comisiones
    // aparecen en reportes con su valor económico real, no como ceros.
    const platformFee = this.platformConfig.platformFee;

    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId },
        data: { credits: { decrement: 1 } },
      });

      await tx.transaction.create({
        data: {
          userId,
          matchId,
          otherUserId,
          type: 'platform_fee',
          amount: -platformFee,
          creditsAmount: -1,
          status: 'completed',
          description,
        },
      });
    });
  }

  // Devolver comisión al wallet (cuando se cancela un match)
  async refundPlatformFee(userId: string, matchId: string): Promise<void> {
    const feeCharged = await this.prisma.transaction.findFirst({
      where: { userId, matchId, type: 'platform_fee', status: 'completed' },
    });
    if (!feeCharged) return;

    const alreadyRefunded = await this.prisma.transaction.findFirst({
      where: {
        userId,
        matchId,
        type: 'refund',
        description: 'Devolución comisión por cancelación',
      },
    });
    if (alreadyRefunded) return;

    // Refund con amount = +platformFee (positivo, dinero recuperado por el usuario)
    const platformFee = this.platformConfig.platformFee;

    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId },
        data: { credits: { increment: 1 } },
      });

      await tx.transaction.create({
        data: {
          userId,
          matchId,
          type: 'refund',
          amount: platformFee,
          creditsAmount: 1,
          status: 'completed',
          description: 'Devolución comisión por cancelación',
        },
      });
    });
  }

  // Obtener historial de transacciones del monedero
  async getTransactionHistory(
    userId: string,
    page = 1,
    limit = 20,
    type?: string,
  ) {
    const skip = (page - 1) * limit;

    // Tipos validos para filtrar
    const validTypes = ['topup', 'pack_purchase', 'platform_fee', 'refund'];
    const filterType = type && validTypes.includes(type) ? type : null;

    // Filtro: mostrar transacciones completadas (topups, fees, refunds)
    // No mostrar pendientes ni canceladas
    let whereClause: object;

    if (filterType) {
      // Filtro por tipo especifico
      whereClause = {
        userId,
        type: filterType,
        status: 'completed',
      };
    } else {
      // Todos los tipos completados
      whereClause = {
        userId,
        OR: [
          // Topups solo completados
          { type: 'topup', status: 'completed' },
          // Platform fees (siempre completados)
          { type: 'platform_fee', status: 'completed' },
          // Refunds completados
          { type: 'refund', status: 'completed' },
        ],
      };
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({
        where: whereClause,
      }),
    ]);

    // Obtener información del otro usuario para transacciones de platform_fee
    const otherUserIds = transactions
      .filter((tx) => tx.otherUserId)
      .map((tx) => tx.otherUserId as string);

    const otherUsers =
      otherUserIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: otherUserIds } },
            select: { id: true, name: true, avatar: true },
          })
        : [];

    const otherUsersMap = new Map(otherUsers.map((u) => [u.id, u]));

    // Enriquecer transacciones con datos del otro usuario
    const enrichedTransactions = transactions.map((tx) => ({
      ...tx,
      otherUser: tx.otherUserId ? otherUsersMap.get(tx.otherUserId) : null,
    }));

    return {
      transactions: enrichedTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
