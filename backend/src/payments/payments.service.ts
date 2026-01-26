import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';

export enum PaymentStatus {
  PENDING = 'pending',
  HELD = 'held', // Pago retenido (escrow)
  RELEASED = 'released', // Liberado al anfitrión
  REFUNDED = 'refunded', // Reembolsado al viajero
  FAILED = 'failed',
}

@Injectable()
export class PaymentsService {
  private stripe: Stripe | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      console.warn('⚠️ STRIPE_SECRET_KEY not configured - payments disabled');
    } else {
      this.stripe = new Stripe(stripeKey);
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
      payment_method_types: ['card'], // Solo tarjeta, sin Link ni otros métodos
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

    // Capturar el pago (transferir al anfitrión)
    await this.ensureStripe().paymentIntents.capture(transaction.stripeId);

    // Actualizar transacción
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: PaymentStatus.RELEASED },
    });

    // Actualizar match
    await this.prisma.match.update({
      where: { id: matchId },
      data: { paymentStatus: PaymentStatus.RELEASED },
    });

    // Actualizar wallet del anfitrión
    await this.prisma.wallet.upsert({
      where: { userId: hostId },
      update: { balance: { increment: transaction.amount } },
      create: { userId: hostId, balance: transaction.amount },
    });
  }

  // Reembolsar el pago al viajero (si se cancela o rechaza)
  async refundPayment(matchId: string, reason: string): Promise<void> {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        matchId: matchId,
        status: { in: [PaymentStatus.HELD, PaymentStatus.PENDING] },
      },
    });

    if (!transaction || !transaction.stripeId) {
      // No hay pago que reembolsar
      return;
    }

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
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        await this.confirmPaymentHeld(paymentIntent.id);
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        await this.handlePaymentFailed(failedPayment.id);
        break;
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
}
