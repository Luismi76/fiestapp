import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
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

export enum PaymentMethod {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
}

interface PayPalTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface PayPalOrderResponse {
  id: string;
  status: string;
  links: Array<{ rel: string; href: string; method: string }>;
  purchase_units?: Array<{
    payments?: {
      authorizations?: Array<{ id: string }>;
      captures?: Array<{ id: string }>;
    };
  }>;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe | null = null;
  private paypalClientId: string | null = null;
  private paypalClientSecret: string | null = null;
  private paypalBaseUrl: string;
  private paypalAccessToken: string | null = null;
  private paypalTokenExpiry: Date | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      this.logger.warn(
        'STRIPE_SECRET_KEY not configured - Stripe payments disabled',
      );
    } else {
      this.stripe = new Stripe(stripeKey);
    }

    // PayPal configuration
    this.paypalClientId =
      this.configService.get<string>('PAYPAL_CLIENT_ID') || null;
    this.paypalClientSecret =
      this.configService.get<string>('PAYPAL_CLIENT_SECRET') || null;
    const isSandbox =
      this.configService.get<string>('PAYPAL_SANDBOX') !== 'false';
    this.paypalBaseUrl = isSandbox
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';

    if (!this.paypalClientId || !this.paypalClientSecret) {
      this.logger.warn(
        'PayPal credentials not configured - PayPal payments disabled',
      );
    }
  }

  private ensureStripe(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException(
        'Pagos con tarjeta no configurados. Contacta al administrador.',
      );
    }
    return this.stripe;
  }

  private ensurePayPal(): void {
    if (!this.paypalClientId || !this.paypalClientSecret) {
      throw new BadRequestException(
        'PayPal no está configurado. Contacta al administrador.',
      );
    }
  }

  // Get PayPal access token (with caching)
  private async getPayPalAccessToken(): Promise<string> {
    this.ensurePayPal();

    // Return cached token if still valid
    if (
      this.paypalAccessToken &&
      this.paypalTokenExpiry &&
      this.paypalTokenExpiry > new Date()
    ) {
      return this.paypalAccessToken;
    }

    const auth = Buffer.from(
      `${this.paypalClientId}:${this.paypalClientSecret}`,
    ).toString('base64');

    const response = await fetch(`${this.paypalBaseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error('PayPal token error:', errorText);
      throw new BadRequestException('Error al autenticar con PayPal');
    }

    const data = (await response.json()) as PayPalTokenResponse;
    this.paypalAccessToken = data.access_token;
    // Set expiry 5 minutes before actual expiry for safety
    this.paypalTokenExpiry = new Date(
      Date.now() + (data.expires_in - 300) * 1000,
    );

    return this.paypalAccessToken;
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
  // Maneja tanto Stripe como PayPal
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

    // Determinar si es PayPal o Stripe
    if (transaction.paypalOrderId) {
      // Reembolso PayPal
      await this.refundPayPalPayment(matchId, reason);
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

  // =====================
  // PayPal Methods
  // =====================

  // Create PayPal order for a match
  async createPayPalOrder(
    matchId: string,
    userId: string,
    returnUrl: string,
    cancelUrl: string,
  ): Promise<{ orderId: string; approvalUrl: string }> {
    this.ensurePayPal();

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

    // Check for existing PayPal transaction
    const existingTransaction = await this.prisma.transaction.findFirst({
      where: {
        matchId: matchId,
        paypalOrderId: { not: null },
        status: { in: ['pending', 'held'] },
      },
    });

    if (existingTransaction && existingTransaction.paypalOrderId) {
      // Get existing order from PayPal
      const accessToken = await this.getPayPalAccessToken();
      const orderResponse = await fetch(
        `${this.paypalBaseUrl}/v2/checkout/orders/${existingTransaction.paypalOrderId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (orderResponse.ok) {
        const order = (await orderResponse.json()) as PayPalOrderResponse;
        const approvalLink = order.links.find((link) => link.rel === 'approve');
        if (approvalLink && order.status === 'CREATED') {
          return {
            orderId: order.id,
            approvalUrl: approvalLink.href,
          };
        }
      }
    }

    const amount = match.experience.price.toFixed(2);
    const accessToken = await this.getPayPalAccessToken();

    const orderPayload = {
      intent: 'AUTHORIZE', // Authorize only, capture later (escrow)
      purchase_units: [
        {
          reference_id: matchId,
          description: `FiestApp: ${match.experience.title}`,
          amount: {
            currency_code: 'EUR',
            value: amount,
          },
          custom_id: matchId,
        },
      ],
      application_context: {
        brand_name: 'FiestApp',
        locale: 'es-ES',
        landing_page: 'LOGIN',
        user_action: 'PAY_NOW',
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    };

    const response = await fetch(`${this.paypalBaseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error('PayPal order creation error:', errorText);
      throw new BadRequestException('Error al crear orden de PayPal');
    }

    const order = (await response.json()) as PayPalOrderResponse;
    const approvalLink = order.links.find((link) => link.rel === 'approve');

    if (!approvalLink) {
      throw new BadRequestException(
        'No se pudo obtener enlace de aprobación de PayPal',
      );
    }

    // Create transaction record
    await this.prisma.transaction.create({
      data: {
        userId: userId,
        matchId: matchId,
        type: 'payment',
        amount: match.experience.price,
        status: PaymentStatus.PENDING,
        paypalOrderId: order.id,
        description: `Pago PayPal por: ${match.experience.title}`,
      },
    });

    return {
      orderId: order.id,
      approvalUrl: approvalLink.href,
    };
  }

  // Authorize PayPal order after user approval
  async authorizePayPalOrder(
    orderId: string,
  ): Promise<{ authorizationId: string }> {
    this.ensurePayPal();

    const transaction = await this.prisma.transaction.findFirst({
      where: { paypalOrderId: orderId },
      include: { match: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transacción no encontrada');
    }

    const accessToken = await this.getPayPalAccessToken();

    // First, get order status
    const orderResponse = await fetch(
      `${this.paypalBaseUrl}/v2/checkout/orders/${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!orderResponse.ok) {
      throw new BadRequestException('Error al obtener estado de orden PayPal');
    }

    const orderData = (await orderResponse.json()) as PayPalOrderResponse;

    // If already authorized, return existing authorization
    if (
      orderData.status === 'COMPLETED' ||
      orderData.purchase_units?.[0]?.payments?.authorizations?.[0]
    ) {
      const authId =
        orderData.purchase_units![0].payments!.authorizations![0].id;
      return { authorizationId: authId };
    }

    // Authorize the order
    const response = await fetch(
      `${this.paypalBaseUrl}/v2/checkout/orders/${orderId}/authorize`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error('PayPal authorization error:', errorText);
      throw new BadRequestException('Error al autorizar pago de PayPal');
    }

    const authData = (await response.json()) as PayPalOrderResponse;
    const authorizationId =
      authData.purchase_units![0].payments!.authorizations![0].id;

    // Update transaction status to HELD
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: PaymentStatus.HELD,
        stripeId: authorizationId, // Reuse stripeId field for authorization ID
      },
    });

    // Update match payment status
    if (transaction.matchId) {
      await this.prisma.match.update({
        where: { id: transaction.matchId },
        data: { paymentStatus: PaymentStatus.HELD },
      });
    }

    return { authorizationId };
  }

  // Capture PayPal authorized payment (release to host)
  async capturePayPalPayment(matchId: string, hostId: string): Promise<void> {
    this.ensurePayPal();

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
        paypalOrderId: { not: null },
        status: PaymentStatus.HELD,
      },
    });

    if (!transaction || !transaction.stripeId) {
      throw new BadRequestException(
        'No hay pago PayPal retenido para este match',
      );
    }

    const accessToken = await this.getPayPalAccessToken();

    // Capture the authorization
    const response = await fetch(
      `${this.paypalBaseUrl}/v2/payments/authorizations/${transaction.stripeId}/capture`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error('PayPal capture error:', errorText);
      throw new BadRequestException('Error al capturar pago de PayPal');
    }

    // Update transaction
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: PaymentStatus.RELEASED },
    });

    // Update match
    await this.prisma.match.update({
      where: { id: matchId },
      data: { paymentStatus: PaymentStatus.RELEASED },
    });

    // Update host wallet
    await this.prisma.wallet.upsert({
      where: { userId: hostId },
      update: { balance: { increment: transaction.amount } },
      create: { userId: hostId, balance: transaction.amount },
    });
  }

  // Refund PayPal payment (void authorization or refund capture)
  async refundPayPalPayment(matchId: string, reason: string): Promise<void> {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        matchId: matchId,
        paypalOrderId: { not: null },
        status: { in: [PaymentStatus.HELD, PaymentStatus.RELEASED] },
      },
    });

    if (!transaction) {
      // No PayPal payment to refund
      return;
    }

    this.ensurePayPal();
    const accessToken = await this.getPayPalAccessToken();

    if (transaction.status === 'held' && transaction.stripeId) {
      // Void the authorization
      const response = await fetch(
        `${this.paypalBaseUrl}/v2/payments/authorizations/${transaction.stripeId}/void`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error('PayPal void error:', errorText);
        throw new BadRequestException('Error al anular autorización de PayPal');
      }
    } else if (transaction.status === 'released' && transaction.stripeId) {
      // Get capture ID and refund
      const orderResponse = await fetch(
        `${this.paypalBaseUrl}/v2/checkout/orders/${transaction.paypalOrderId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (orderResponse.ok) {
        const orderData = (await orderResponse.json()) as PayPalOrderResponse;
        const captureId =
          orderData.purchase_units?.[0]?.payments?.captures?.[0]?.id;

        if (captureId) {
          const refundResponse = await fetch(
            `${this.paypalBaseUrl}/v2/payments/captures/${captureId}/refund`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                note_to_payer: reason,
              }),
            },
          );

          if (!refundResponse.ok) {
            const errorText = await refundResponse.text();
            this.logger.error('PayPal refund error:', errorText);
            throw new BadRequestException('Error al reembolsar pago de PayPal');
          }
        }
      }
    }

    // Update transaction
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: PaymentStatus.REFUNDED,
        description: `${transaction.description} - Reembolso: ${reason}`,
      },
    });

    // Update match
    if (transaction.matchId) {
      await this.prisma.match.update({
        where: { id: transaction.matchId },
        data: { paymentStatus: PaymentStatus.REFUNDED },
      });
    }
  }

  // Handle PayPal webhook events
  async handlePayPalWebhook(event: {
    event_type: string;
    resource: {
      id?: string;
      supplementary_data?: { related_ids?: { order_id?: string } };
      status?: string;
    };
  }): Promise<void> {
    this.logger.log(`PayPal webhook: ${event.event_type}`);

    switch (event.event_type) {
      case 'CHECKOUT.ORDER.APPROVED': {
        // User approved the payment, authorize it
        const orderId = event.resource.id;
        if (orderId) {
          await this.authorizePayPalOrder(orderId);
        }
        break;
      }

      case 'PAYMENT.AUTHORIZATION.CREATED': {
        // Authorization created, update transaction
        const orderId =
          event.resource.supplementary_data?.related_ids?.order_id;
        if (orderId) {
          const transaction = await this.prisma.transaction.findFirst({
            where: { paypalOrderId: orderId },
          });
          if (transaction && transaction.status === 'pending') {
            await this.prisma.transaction.update({
              where: { id: transaction.id },
              data: {
                status: PaymentStatus.HELD,
                stripeId: event.resource.id,
              },
            });
          }
        }
        break;
      }

      case 'PAYMENT.AUTHORIZATION.VOIDED': {
        // Authorization voided (refund)
        const authId = event.resource.id;
        if (authId) {
          const transaction = await this.prisma.transaction.findFirst({
            where: { stripeId: authId },
          });
          if (transaction) {
            await this.prisma.transaction.update({
              where: { id: transaction.id },
              data: { status: PaymentStatus.REFUNDED },
            });
          }
        }
        break;
      }

      case 'PAYMENT.CAPTURE.COMPLETED': {
        // Payment captured (released to host)
        const orderId =
          event.resource.supplementary_data?.related_ids?.order_id;
        if (orderId) {
          const transaction = await this.prisma.transaction.findFirst({
            where: { paypalOrderId: orderId },
          });
          if (transaction) {
            await this.prisma.transaction.update({
              where: { id: transaction.id },
              data: { status: PaymentStatus.RELEASED },
            });
          }
        }
        break;
      }
    }
  }

  // Get available payment methods
  getAvailablePaymentMethods(): PaymentMethod[] {
    const methods: PaymentMethod[] = [];
    if (this.stripe) {
      methods.push(PaymentMethod.STRIPE);
    }
    if (this.paypalClientId && this.paypalClientSecret) {
      methods.push(PaymentMethod.PAYPAL);
    }
    return methods;
  }
}
