import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Request,
  Headers,
  Req,
  BadRequestException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string };
}

@Controller('payments')
export class PaymentsController {
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
      throw new BadRequestException('Pagos no configurados. Contacta al administrador.');
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
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      console.warn('⚠️ STRIPE_WEBHOOK_SECRET not configured');
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
      console.error('Webhook error:', err);
      throw err;
    }
  }
}
