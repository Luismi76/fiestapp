import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StripeIdempotencyService } from '../common/stripe-idempotency.service';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import Stripe from 'stripe';

// Constantes legacy (se mantienen para compatibilidad de imports existentes, pero el servicio usa PlatformConfigService)
export const PLATFORM_FEE = 1.5;
export const MIN_TOPUP = 4.5;
export const VAT_RATE = 0.21;

export type TransactionType = 'topup' | 'platform_fee' | 'refund';

@Injectable()
export class WalletService {
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

    return wallet;
  }

  // Obtener saldo
  async getBalance(userId: string): Promise<number> {
    const wallet = await this.getWallet(userId);
    return wallet.balance;
  }

  // Verificar si tiene saldo suficiente
  async hasEnoughBalance(
    userId: string,
    amount?: number,
  ): Promise<boolean> {
    if (amount === undefined) amount = this.platformConfig.platformFee;
    const balance = await this.getBalance(userId);
    return balance >= amount;
  }

  // Crear sesión de Stripe Checkout para recarga de monedero
  async createTopUpSession(
    userId: string,
    amount: number = MIN_TOPUP,
  ): Promise<{
    sessionUrl: string;
    sessionId: string;
  }> {
    if (amount < MIN_TOPUP) {
      throw new BadRequestException(`La recarga mínima es de ${MIN_TOPUP}€`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Cancelar transacciones pendientes antiguas (más de 30 minutos)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    await this.prisma.transaction.updateMany({
      where: {
        userId,
        type: 'topup',
        status: 'pending',
        createdAt: { lt: thirtyMinutesAgo },
      },
      data: { status: 'cancelled' },
    });

    // Calcular IVA: el usuario paga amount + IVA, el monedero recibe amount
    const vatAmount = Math.round(amount * VAT_RATE * 100) / 100;
    const totalCharge = Math.round((amount + vatAmount) * 100) / 100;

    // Crear Stripe Checkout Session con dos líneas: recarga + IVA
    const session = await this.ensureStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Recarga FiestApp`,
              description: `Saldo para tu monedero`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `IVA (21%)`,
              description: `Impuesto sobre la recarga`,
            },
            unit_amount: Math.round(vatAmount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        type: 'wallet_topup',
        walletAmount: amount.toString(),
        vatAmount: vatAmount.toString(),
        totalCharge: totalCharge.toString(),
      },
      success_url: `${this.frontendUrl}/wallet/topup-result?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.frontendUrl}/wallet/topup-result?status=error`,
    });

    // Registrar transacción pendiente (amount = lo que recibe el monedero, sin IVA)
    await this.prisma.transaction.create({
      data: {
        userId,
        type: 'topup',
        amount,
        status: 'pending',
        stripeId: session.id,
        description: `Recarga de monedero: ${amount}€ (IVA: ${vatAmount}€, total cobrado: ${totalCharge}€)`,
      },
    });

    this.logger.debug(
      `TopUp session created: sessionId=${session.id}, wallet=${amount}€, vat=${vatAmount}€, total=${totalCharge}€, user=${userId}`,
    );

    return {
      sessionUrl: session.url!,
      sessionId: session.id,
    };
  }

  // Procesar webhook de Stripe para recargas
  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    if (event.type !== 'checkout.session.completed') {
      return;
    }

    const session = event.data.object;

    // Solo procesar eventos de wallet_topup
    if (session.metadata?.type !== 'wallet_topup') {
      return;
    }

    // Idempotencia: evitar procesar el mismo evento dos veces
    if (await this.stripeIdempotency.isAlreadyProcessed(event.id, event.type)) {
      return;
    }

    const sessionId = session.id;

    this.logger.log(`Stripe wallet webhook: session=${sessionId}`);

    const transaction = await this.prisma.transaction.findFirst({
      where: { stripeId: sessionId, type: 'topup' },
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
      // Pago exitoso - actualizar saldo
      await this.prisma.$transaction(async (tx) => {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: { status: 'completed' },
        });

        await tx.wallet.upsert({
          where: { userId: transaction.userId },
          update: { balance: { increment: transaction.amount } },
          create: { userId: transaction.userId, balance: transaction.amount },
        });
      });

      this.logger.log(
        `TopUp completed: session=${sessionId}, amount=${transaction.amount}€, user=${transaction.userId}`,
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

  // Verificar resultado de un pedido (llamado desde el frontend al volver de Stripe)
  async checkTopUpResult(
    sessionId: string,
    userId: string,
  ): Promise<{ success: boolean; amount?: number }> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { stripeId: sessionId, type: 'topup', userId },
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

            await tx.wallet.upsert({
              where: { userId: transaction.userId },
              update: { balance: { increment: transaction.amount } },
              create: {
                userId: transaction.userId,
                balance: transaction.amount,
              },
            });
          });

          return { success: true, amount: transaction.amount };
        }
      } catch {
        // Si falla la verificación, devolver el estado actual de BD
      }
    }

    return {
      success: transaction.status === 'completed',
      amount: transaction.amount,
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
  async deductPlatformFee(
    userId: string,
    matchId: string,
    experienceTitle: string,
    role: 'host' | 'guest',
    otherUserId: string,
    otherUserName: string,
  ): Promise<void> {
    const wallet = await this.getWallet(userId);

    const fee = this.platformConfig.platformFee;

    if (wallet.balance < fee) {
      throw new BadRequestException(
        `Saldo insuficiente. Necesitas ${fee}€ para completar esta operación.`,
      );
    }

    // Descripción clara: Experiencia + con quién
    const description =
      role === 'host'
        ? `${experienceTitle} · ${otherUserName}`
        : `${experienceTitle} · con ${otherUserName}`;

    await this.prisma.$transaction(async (tx) => {
      // Descontar del monedero
      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: fee } },
      });

      // Registrar transacción
      await tx.transaction.create({
        data: {
          userId,
          matchId,
          otherUserId,
          type: 'platform_fee',
          amount: -fee,
          status: 'completed',
          description,
        },
      });
    });
  }

  // Devolver comisión al wallet (cuando se cancela un match)
  async refundPlatformFee(userId: string, matchId: string): Promise<void> {
    // Verificar que existe una comisión cobrada para este match y que no se devolvió ya
    const feeCharged = await this.prisma.transaction.findFirst({
      where: { userId, matchId, type: 'platform_fee', status: 'completed' },
    });
    if (!feeCharged) return; // No se cobró comisión, nada que devolver

    const alreadyRefunded = await this.prisma.transaction.findFirst({
      where: {
        userId,
        matchId,
        type: 'refund',
        description: 'Devolución comisión por cancelación',
      },
    });
    if (alreadyRefunded) return; // Ya se devolvió

    const fee = this.platformConfig.platformFee;

    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId },
        data: { balance: { increment: fee } },
      });

      await tx.transaction.create({
        data: {
          userId,
          matchId,
          type: 'refund',
          amount: fee,
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
    const validTypes = ['topup', 'platform_fee', 'refund'];
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
