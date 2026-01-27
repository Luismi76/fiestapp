import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  Headers,
  Req,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

class CreatePayPalOrderDto {
  returnUrl: string;
  cancelUrl: string;
}

class AuthorizePayPalOrderDto {
  orderId: string;
}

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);
  private stripe: Stripe | null = null;

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
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

  // Crear Payment Intent para un match
  @UseGuards(JwtAuthGuard)
  @Post('create-intent/:matchId')
  async createPaymentIntent(
    @Param('matchId') matchId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.paymentsService.createPaymentIntent(matchId, req.user.userId);
  }

  // Obtener estado del pago
  @UseGuards(JwtAuthGuard)
  @Get('status/:matchId')
  async getPaymentStatus(
    @Param('matchId') matchId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.paymentsService.getPaymentStatus(matchId, req.user.userId);
  }

  // Liberar pago al anfitrión (después de completar)
  @UseGuards(JwtAuthGuard)
  @Post('release/:matchId')
  async releasePayment(
    @Param('matchId') matchId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.paymentsService.releasePayment(matchId, req.user.userId);
    return { success: true, message: 'Pago liberado correctamente' };
  }

  // Webhook de Stripe (sin auth, usa firma de Stripe)
  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    if (!webhookSecret) {
      this.logger.warn('STRIPE_WEBHOOK_SECRET not configured');
      return { received: true };
    }

    try {
      const event = this.ensureStripe().webhooks.constructEvent(
        req.rawBody!,
        signature,
        webhookSecret,
      );

      await this.paymentsService.handleWebhook(event);

      return { received: true };
    } catch (err) {
      this.logger.error(
        'Webhook error',
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }

  // =====================
  // PayPal Endpoints
  // =====================

  // Obtener métodos de pago disponibles
  @Get('methods')
  getPaymentMethods() {
    return {
      methods: this.paymentsService.getAvailablePaymentMethods(),
    };
  }

  // Crear orden de PayPal
  @UseGuards(JwtAuthGuard)
  @Post('paypal/create/:matchId')
  async createPayPalOrder(
    @Param('matchId') matchId: string,
    @Body() body: CreatePayPalOrderDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.paymentsService.createPayPalOrder(
      matchId,
      req.user.userId,
      body.returnUrl,
      body.cancelUrl,
    );
  }

  // Autorizar orden de PayPal (después de aprobación del usuario)
  @UseGuards(JwtAuthGuard)
  @Post('paypal/authorize')
  async authorizePayPalOrder(
    @Body() body: AuthorizePayPalOrderDto,
    @Request() req: AuthenticatedRequest,
  ) {
    // Verify user is the owner of the transaction
    const transaction = await this.paymentsService[
      'prisma'
    ].transaction.findFirst({
      where: { paypalOrderId: body.orderId },
    });

    if (!transaction || transaction.userId !== req.user.userId) {
      throw new BadRequestException('Orden no encontrada o no autorizada');
    }

    return this.paymentsService.authorizePayPalOrder(body.orderId);
  }

  // Liberar pago de PayPal al anfitrión
  @UseGuards(JwtAuthGuard)
  @Post('paypal/release/:matchId')
  async releasePayPalPayment(
    @Param('matchId') matchId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.paymentsService.capturePayPalPayment(matchId, req.user.userId);
    return { success: true, message: 'Pago PayPal liberado correctamente' };
  }

  // Webhook de PayPal (sin auth, usa verificación de PayPal)
  @Post('paypal/webhook')
  async handlePayPalWebhook(
    @Headers('paypal-transmission-id') transmissionId: string,
    @Headers('paypal-transmission-time') transmissionTime: string,
    @Headers('paypal-transmission-sig') transmissionSig: string,
    @Headers('paypal-cert-url') certUrl: string,
    @Headers('paypal-auth-algo') authAlgo: string,
    @Body() event: { event_type: string; resource: Record<string, unknown> },
  ) {
    const webhookId = this.configService.get<string>('PAYPAL_WEBHOOK_ID');

    if (!webhookId) {
      this.logger.warn(
        'PAYPAL_WEBHOOK_ID not configured - skipping webhook verification',
      );
    } else {
      // Verificar la firma del webhook con PayPal
      const isValid = await this.paymentsService.verifyPayPalWebhook({
        transmissionId,
        transmissionTime,
        transmissionSig,
        certUrl,
        authAlgo,
        webhookId,
        body: event,
      });

      if (!isValid) {
        this.logger.error('PayPal webhook signature verification failed');
        throw new BadRequestException('Firma del webhook inválida');
      }

      this.logger.log('PayPal webhook signature verified successfully');
    }

    try {
      await this.paymentsService.handlePayPalWebhook(
        event as {
          event_type: string;
          resource: {
            id?: string;
            supplementary_data?: { related_ids?: { order_id?: string } };
            status?: string;
          };
        },
      );
      return { received: true };
    } catch (err) {
      this.logger.error(
        'PayPal webhook error',
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }
}
