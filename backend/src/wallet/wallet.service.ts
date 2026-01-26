import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';

// Constantes del modelo de negocio
export const PLATFORM_FEE = 1.5; // 1,50€ por operación
export const MIN_TOPUP = 4.5; // 4,50€ mínimo de recarga (3 operaciones)

export type TransactionType = 'topup' | 'platform_fee' | 'refund';

@Injectable()
export class WalletService {
  private stripe: Stripe | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey);
    } else {
      console.warn(
        '⚠️ STRIPE_SECRET_KEY not configured - wallet topup disabled',
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
    amount: number = PLATFORM_FEE,
  ): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance >= amount;
  }

  // Crear Payment Intent para recarga
  async createTopUpIntent(
    userId: string,
    amount: number = MIN_TOPUP,
  ): Promise<{
    clientSecret: string;
    paymentIntentId: string;
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

    // Buscar transacción pendiente reciente (menos de 30 minutos) para reutilizar
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const existingPending = await this.prisma.transaction.findFirst({
      where: {
        userId,
        type: 'topup',
        status: 'pending',
        amount,
        createdAt: { gte: thirtyMinutesAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingPending && existingPending.stripeId) {
      // Verificar que el PaymentIntent aún es válido en Stripe
      try {
        const existingIntent =
          await this.ensureStripe().paymentIntents.retrieve(
            existingPending.stripeId,
          );
        if (
          existingIntent.status === 'requires_payment_method' ||
          existingIntent.status === 'requires_confirmation'
        ) {
          console.log(
            'Reutilizando PaymentIntent existente:',
            existingPending.stripeId,
          );
          return {
            clientSecret: existingIntent.client_secret!,
            paymentIntentId: existingIntent.id,
          };
        }
      } catch {
        console.log('PaymentIntent existente no válido, creando nuevo');
      }
    }

    // Cancelar transacciones pendientes antiguas (más de 30 minutos)
    await this.prisma.transaction.updateMany({
      where: {
        userId,
        type: 'topup',
        status: 'pending',
        createdAt: { lt: thirtyMinutesAgo },
      },
      data: { status: 'cancelled' },
    });

    const amountInCents = Math.round(amount * 100);

    const paymentIntent = await this.ensureStripe().paymentIntents.create({
      amount: amountInCents,
      currency: 'eur',
      payment_method_types: ['card'], // Solo tarjeta para simplificar
      metadata: {
        userId,
        type: 'wallet_topup',
        amount: amount.toString(),
      },
      description: `FiestApp: Recarga de monedero ${amount}€`,
    });

    // Registrar transacción pendiente
    await this.prisma.transaction.create({
      data: {
        userId,
        type: 'topup',
        amount,
        status: 'pending',
        stripeId: paymentIntent.id,
        description: `Recarga de monedero: ${amount}€`,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    };
  }

  // Confirmar recarga después del pago exitoso
  async confirmTopUp(paymentIntentId: string): Promise<void> {
    console.log('confirmTopUp called with paymentIntentId:', paymentIntentId);

    const transaction = await this.prisma.transaction.findFirst({
      where: { stripeId: paymentIntentId, type: 'topup' },
    });

    console.log(
      'Found transaction:',
      transaction
        ? {
            id: transaction.id,
            status: transaction.status,
            stripeId: transaction.stripeId,
          }
        : null,
    );

    if (!transaction) {
      throw new NotFoundException('Transacción no encontrada');
    }

    if (transaction.status === 'completed') {
      console.log('Transaction already completed, skipping');
      // Ya procesada
      return;
    }

    // Verificar estado en Stripe
    console.log('Retrieving PaymentIntent from Stripe...');
    const paymentIntent =
      await this.ensureStripe().paymentIntents.retrieve(paymentIntentId);
    console.log('Stripe PaymentIntent status:', paymentIntent.status);

    // Aceptar 'succeeded' o 'processing' (algunos pagos tardan un momento)
    const validStatuses = ['succeeded', 'processing', 'requires_capture'];
    if (!validStatuses.includes(paymentIntent.status)) {
      console.log(`Payment intent status: ${paymentIntent.status}`);
      throw new BadRequestException(
        `El pago no se ha completado. Estado: ${paymentIntent.status}`,
      );
    }

    // Actualizar saldo y transacción en una transacción atómica
    await this.prisma.$transaction(async (tx) => {
      // Actualizar transacción
      await tx.transaction.update({
        where: { id: transaction.id },
        data: { status: 'completed' },
      });

      // Añadir saldo al monedero
      await tx.wallet.upsert({
        where: { userId: transaction.userId },
        update: { balance: { increment: transaction.amount } },
        create: { userId: transaction.userId, balance: transaction.amount },
      });
    });
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

    if (wallet.balance < PLATFORM_FEE) {
      throw new BadRequestException(
        `Saldo insuficiente. Necesitas ${PLATFORM_FEE}€ para completar esta operación.`,
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
        data: { balance: { decrement: PLATFORM_FEE } },
      });

      // Registrar transacción
      await tx.transaction.create({
        data: {
          userId,
          matchId,
          otherUserId,
          type: 'platform_fee',
          amount: -PLATFORM_FEE,
          status: 'completed',
          description,
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

  // Webhook handler para eventos de Stripe relacionados con el monedero
  async handleWebhook(event: Stripe.Event): Promise<void> {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;

      // Solo procesar recargas de monedero
      if (paymentIntent.metadata?.type === 'wallet_topup') {
        await this.confirmTopUp(paymentIntent.id);
      }
    }
  }
}
