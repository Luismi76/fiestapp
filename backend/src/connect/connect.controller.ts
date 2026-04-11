import { SkipThrottle } from '@nestjs/throttler';
import {
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  Headers,
  Req,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConnectService } from './connect.service';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('connect')
export class ConnectController {
  private readonly logger = new Logger(ConnectController.name);
  private stripe: Stripe | null = null;

  constructor(
    private readonly connectService: ConnectService,
    private readonly configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey);
    }
  }

  // Crear cuenta Express de Stripe Connect
  @Post('create-account')
  @UseGuards(JwtAuthGuard)
  async createAccount(@Request() req: AuthenticatedRequest) {
    return this.connectService.createConnectAccount(req.user.userId);
  }

  // Generar link de onboarding
  @Post('create-link')
  @UseGuards(JwtAuthGuard)
  async createLink(@Request() req: AuthenticatedRequest) {
    return this.connectService.createAccountLink(req.user.userId);
  }

  // Consultar estado de la cuenta
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@Request() req: AuthenticatedRequest) {
    return this.connectService.getAccountStatus(req.user.userId);
  }

  // Generar link al dashboard Express
  @Post('dashboard-link')
  @UseGuards(JwtAuthGuard)
  async dashboardLink(@Request() req: AuthenticatedRequest) {
    return this.connectService.createDashboardLink(req.user.userId);
  }

  // Webhook de Stripe Connect - SIN autenticación JWT ni rate limiting
  @SkipThrottle()
  @Post('webhook')
  async connectWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_CONNECT_WEBHOOK_SECRET',
    );

    if (!webhookSecret) {
      throw new ServiceUnavailableException(
        'Stripe Connect webhook not configured',
      );
    }

    if (!this.stripe) {
      throw new ServiceUnavailableException('Stripe not configured');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        req.rawBody!,
        signature,
        webhookSecret,
      );

      await this.connectService.handleConnectWebhook(event);
    } catch (error) {
      this.logger.error('Connect webhook error:', error);
    }

    return { received: true };
  }
}
