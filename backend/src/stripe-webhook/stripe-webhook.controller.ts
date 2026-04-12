import { SkipThrottle } from '@nestjs/throttler';
import {
  Controller,
  Post,
  Headers,
  Req,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WalletService } from '../wallet/wallet.service';
import { MatchesService } from '../matches/matches.service';
import { PaymentsService } from '../payments/payments.service';
import { ConnectService } from '../connect/connect.service';
import { PaymentPlanService } from '../matches/payment-plan.service';
import Stripe from 'stripe';

/**
 * Webhook unificado de Stripe.
 * Un solo endpoint, un solo secret, despacha internamente según tipo de evento y metadata.
 *
 * URL a configurar en Stripe Dashboard:
 *   https://fiestapp-api.lmsc.es/api/stripe/webhook
 */
@Controller('stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);
  private stripe: Stripe | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly walletService: WalletService,
    private readonly matchesService: MatchesService,
    private readonly paymentsService: PaymentsService,
    private readonly connectService: ConnectService,
    private readonly paymentPlanService: PaymentPlanService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey);
    }
  }

  @SkipThrottle()
  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    if (!webhookSecret || !this.stripe) {
      throw new ServiceUnavailableException('Stripe webhook not configured');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        req.rawBody!,
        signature,
        webhookSecret,
      );
    } catch (error) {
      this.logger.error(
        'Webhook signature verification failed',
        error instanceof Error ? error.message : String(error),
      );
      return { received: false };
    }

    this.logger.log(`Stripe webhook: ${event.type} (${event.id})`);

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const metadataType = session.metadata?.type;

          if (metadataType === 'pack_purchase') {
            // Compra de pack → WalletService
            await this.walletService.handleStripeWebhook(event);
          } else if (metadataType === 'experience_payment') {
            // Pago de experiencia → MatchesService
            await this.matchesService.handleExperiencePaymentWebhook(event);
          } else if (metadataType === 'deposit_payment') {
            // Depósito de reserva → PaymentPlanService
            await this.paymentPlanService.handleDepositWebhook(event);
          } else {
            this.logger.debug(
              `checkout.session.completed ignorado: metadata.type=${metadataType}`,
            );
          }
          break;
        }

        case 'payment_intent.succeeded':
        case 'payment_intent.payment_failed': {
          // Payment intents legacy → PaymentsService
          await this.paymentsService.handleWebhook(event);
          break;
        }

        case 'account.updated': {
          // Stripe Connect → ConnectService
          await this.connectService.handleConnectWebhook(event);
          break;
        }

        default:
          this.logger.debug(`Evento Stripe ignorado: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(
        `Error procesando ${event.type}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return { received: true };
  }
}
