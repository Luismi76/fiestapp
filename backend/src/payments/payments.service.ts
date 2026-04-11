import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { StripeIdempotencyService } from '../common/stripe-idempotency.service';
import { ConnectService } from '../connect/connect.service';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import Stripe from 'stripe';

export enum PaymentStatus {
  PENDING = 'pending',
  HELD = 'held', // Pago retenido (escrow)
  CAPTURING = 'capturing', // Captura iniciada en pasarela, pendiente de confirmar en BD
  RELEASED = 'released', // Liberado al anfitrión
  REFUNDED = 'refunded', // Reembolsado al viajero
  FAILED = 'failed',
}

/**
 * @deprecated Este servicio es legacy. El flujo principal de pagos de experiencias
 * está en MatchesService.createExperiencePayment() y handleExperiencePaymentWebhook().
 * Las recargas de monedero están en WalletService.
 * Solo mantener para compatibilidad con payment intents antiguos y el cron de reconciliación.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private stripeIdempotency: StripeIdempotencyService,
    private connectService: ConnectService,
    private platformConfig: PlatformConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      this.logger.warn(
        'STRIPE_SECRET_KEY not configured - Stripe payments disabled',
      );
    } else {
      this.stripe = new Stripe(stripeKey);
    }
  }

  ensureStripe(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException(
        'Pagos con tarjeta no configurados. Contacta al administrador.',
      );
    }
    return this.stripe;
  }

  // Crear Payment Intent para retener el pago (escrow)
  async createPaymentIntent(
    matchId: string,
    userId: string,
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        experience: true,
        requester: true,
        host: true,
      },
    });

    if (!match) {
      throw new NotFoundException('Match no encontrado');
    }

    if (match.requesterId !== userId) {
      throw new BadRequestException(
        'Solo el solicitante puede realizar el pago',
      );
    }

    if (match.status !== 'pending') {
      throw new BadRequestException('El match debe estar pendiente para pagar');
    }

    if (!match.experience.price) {
      throw new BadRequestException('Esta experiencia no requiere pago');
    }

    // Verificar si ya existe un pago para este match
    const existingTransaction = await this.prisma.transaction.findFirst({
      where: {
        matchId: matchId,
        status: { in: ['pending', 'held'] },
      },
    });

    if (existingTransaction) {
      // Retornar el payment intent existente
      const paymentIntent = await this.ensureStripe().paymentIntents.retrieve(
        existingTransaction.stripeId!,
      );
      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
      };
    }

    const amount = Math.round(match.experience.price * 100); // Stripe usa centavos

    // Crear Payment Intent con capture manual (para escrow)
    const paymentIntent = await this.ensureStripe().paymentIntents.create({
      amount,
      currency: 'eur',
      payment_method_types: ['card'],
      capture_method: 'manual', // No capturar automáticamente
      metadata: {
        matchId: match.id,
        experienceId: match.experienceId,
        requesterId: match.requesterId,
        hostId: match.hostId,
      },
      description: `FiestApp: ${match.experience.title}`,
    });

    // Crear registro de transacción
    await this.prisma.transaction.create({
      data: {
        userId: userId,
        matchId: matchId,
        type: 'payment',
        amount: match.experience.price,
        status: PaymentStatus.PENDING,
        stripeId: paymentIntent.id,
        description: `Pago por: ${match.experience.title}`,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    };
  }

  // Confirmar que el pago fue autorizado (retener fondos)
  async confirmPaymentHeld(paymentIntentId: string): Promise<void> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { stripeId: paymentIntentId },
      include: { match: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transacción no encontrada');
    }

    // Verificar el estado en Stripe
    const paymentIntent =
      await this.ensureStripe().paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'requires_capture') {
      // El pago está autorizado y retenido
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: PaymentStatus.HELD },
      });

      // Actualizar el match para indicar que el pago está retenido
      if (transaction.matchId) {
        await this.prisma.match.update({
          where: { id: transaction.matchId },
          data: { paymentStatus: PaymentStatus.HELD },
        });
      }
    }
  }

  // Liberar el pago al anfitrión (cuando se completa la experiencia)
  async releasePayment(matchId: string, hostId: string): Promise<void> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException('Match no encontrado');
    }

    if (match.hostId !== hostId) {
      throw new BadRequestException('Solo el anfitrión puede liberar el pago');
    }

    if (match.status !== 'completed') {
      throw new BadRequestException('La experiencia debe estar completada');
    }

    const transaction = await this.prisma.transaction.findFirst({
      where: {
        matchId: matchId,
        status: PaymentStatus.HELD,
      },
    });

    if (!transaction || !transaction.stripeId) {
      throw new BadRequestException('No hay pago retenido para este match');
    }

    // Marcar como CAPTURING antes de llamar a la pasarela
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: PaymentStatus.CAPTURING },
    });

    // Capturar el pago (transferir al anfitrión)
    try {
      await this.ensureStripe().paymentIntents.capture(transaction.stripeId);
    } catch (error) {
      // Revertir a HELD si la captura falla
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: PaymentStatus.HELD },
      });
      throw error;
    }

    // Actualizar BD atómicamente
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: { status: PaymentStatus.RELEASED },
        });

        await tx.match.update({
          where: { id: matchId },
          data: { paymentStatus: PaymentStatus.RELEASED },
        });

        await tx.wallet.upsert({
          where: { userId: hostId },
          update: { balance: { increment: transaction.amount } },
          create: { userId: hostId, balance: transaction.amount },
        });
      });
    } catch (error) {
      // Queda en CAPTURING → el cron de reconciliación lo detectará y completará
      this.logger.error(
        `CRITICAL: Stripe payment captured but DB update failed for match ${matchId}. Status left as CAPTURING for reconciliation.`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  // Reembolsar el pago al viajero (si se cancela o rechaza)
  async refundPayment(matchId: string, reason: string): Promise<void> {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        matchId: matchId,
        status: { in: [PaymentStatus.HELD, PaymentStatus.PENDING] },
      },
    });

    if (!transaction) {
      // No hay pago que reembolsar
      return;
    }

    if (!transaction.stripeId) {
      // No hay ID de pago
      return;
    }

    // Reembolso Stripe
    const paymentIntent = await this.ensureStripe().paymentIntents.retrieve(
      transaction.stripeId,
    );

    if (paymentIntent.status === 'requires_capture') {
      // Si está retenido, cancelar el payment intent
      await this.ensureStripe().paymentIntents.cancel(transaction.stripeId);
    } else if (paymentIntent.status === 'succeeded') {
      // Si ya fue capturado, hacer refund
      await this.ensureStripe().refunds.create({
        payment_intent: transaction.stripeId,
        reason: 'requested_by_customer',
      });
    }

    // Actualizar transacción
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: PaymentStatus.REFUNDED,
        description: `${transaction.description} - Reembolso: ${reason}`,
      },
    });

    // Actualizar match
    await this.prisma.match.update({
      where: { id: matchId },
      data: { paymentStatus: PaymentStatus.REFUNDED },
    });
  }

  // Obtener estado del pago de un match
  async getPaymentStatus(matchId: string, userId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { experience: true },
    });

    if (!match) {
      throw new NotFoundException('Match no encontrado');
    }

    if (match.requesterId !== userId && match.hostId !== userId) {
      throw new BadRequestException('No tienes acceso a este match');
    }

    const transaction = await this.prisma.transaction.findFirst({
      where: { matchId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      requiresPayment:
        match.experience.price !== null && match.experience.price > 0,
      amount: match.experience.price,
      status: transaction?.status || null,
      paymentStatus: match.paymentStatus,
    };
  }

  // Webhook handler para eventos de Stripe
  async handleWebhook(event: Stripe.Event): Promise<void> {
    // Idempotencia: evitar procesar el mismo evento dos veces
    if (await this.stripeIdempotency.isAlreadyProcessed(event.id, event.type)) {
      return;
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        await this.confirmPaymentHeld(paymentIntent.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const failedPayment = event.data.object;
        await this.handlePaymentFailed(failedPayment.id);
        break;
      }
    }
  }

  private async handlePaymentFailed(paymentIntentId: string): Promise<void> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { stripeId: paymentIntentId },
    });

    if (transaction) {
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: PaymentStatus.FAILED },
      });
    }
  }

  // Reconciliación: detecta transacciones en CAPTURING (capturadas en pasarela pero BD falló)
  @Cron(CronExpression.EVERY_10_MINUTES)
  async reconcileCapturingPayments(): Promise<void> {
    const staleTransactions = await this.prisma.transaction.findMany({
      where: {
        status: PaymentStatus.CAPTURING,
        updatedAt: { lt: new Date(Date.now() - 2 * 60 * 1000) }, // >2 min en CAPTURING
      },
      include: { match: true },
    });

    if (staleTransactions.length === 0) return;

    this.logger.warn(
      `Reconciliation: found ${staleTransactions.length} transactions stuck in CAPTURING`,
    );

    for (const transaction of staleTransactions) {
      try {
        const hostId = transaction.match?.hostId;
        const matchId = transaction.matchId;
        if (!hostId || !matchId) {
          this.logger.error(
            `Reconciliation: transaction ${transaction.id} has no host or match, skipping`,
          );
          continue;
        }

        const grossAmount = Math.abs(transaction.amount);
        const stripeFee = this.platformConfig.calculateStripeFee(grossAmount);
        const netAmount = Math.round((grossAmount - stripeFee) * 100) / 100;

        await this.connectService.createTransferToHost(
          hostId,
          netAmount,
          matchId,
          `Reconciliación pago experiencia - Match ${matchId}`,
        );

        await this.prisma.$transaction(async (tx) => {
          await tx.transaction.update({
            where: { id: transaction.id },
            data: { status: PaymentStatus.RELEASED },
          });

          await tx.match.update({
            where: { id: matchId },
            data: { paymentStatus: PaymentStatus.RELEASED },
          });
        });

        this.logger.log(
          `Reconciliation: transaction ${transaction.id} for match ${transaction.matchId} completed successfully`,
        );
      } catch (error) {
        this.logger.error(
          `Reconciliation: failed to complete transaction ${transaction.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
