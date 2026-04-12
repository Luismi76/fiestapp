import { SkipThrottle } from '@nestjs/throttler';
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  Headers,
  Req,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WalletService } from './wallet.service';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('wallet')
export class WalletController {
  private readonly logger = new Logger(WalletController.name);
  private stripe: Stripe | null = null;

  constructor(
    private readonly walletService: WalletService,
    private readonly configService: ConfigService,
    private readonly platformConfig: PlatformConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey);
    }
  }

  // Obtener información del monedero
  @Get()
  @UseGuards(JwtAuthGuard)
  async getWallet(@Request() req: AuthenticatedRequest) {
    const wallet = await this.walletService.getWallet(req.user.userId);

    return {
      credits: wallet.credits,
      canOperate: wallet.credits >= 1,
      platformFee: this.platformConfig.platformFee,
      vatRate: this.platformConfig.vatRate,
      operationsAvailable: wallet.credits,
      packs: this.platformConfig.getPacks(),
    };
  }

  // Obtener packs disponibles (público para mostrar precios sin login)
  @Get('packs')
  getPacks() {
    return { data: this.platformConfig.getPacks() };
  }

  // Comprar un pack
  @Post('purchase-pack')
  @UseGuards(JwtAuthGuard)
  async purchasePack(
    @Request() req: AuthenticatedRequest,
    @Body() body: { packId: string; returnTo?: string },
  ) {
    return this.walletService.createPackPurchaseSession(
      req.user.userId,
      body.packId,
      body.returnTo,
    );
  }

  // Webhook de Stripe para compras de pack - SIN autenticación JWT ni rate limiting
  @SkipThrottle()
  @Post('stripe-webhook')
  async stripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    if (!webhookSecret) {
      throw new ServiceUnavailableException('Stripe webhook not configured');
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

      await this.walletService.handleStripeWebhook(event);
    } catch (error) {
      this.logger.error('Wallet webhook error:', error);
    }

    // Siempre responder 200 para que Stripe no reintente
    return { received: true };
  }

  // Verificar resultado de compra de pack (llamado desde el frontend al volver de Stripe)
  @Get('topup-result')
  @UseGuards(JwtAuthGuard)
  async checkPurchaseResult(
    @Request() req: AuthenticatedRequest,
    @Query('sessionId') sessionId: string,
  ) {
    return this.walletService.checkPurchaseResult(sessionId, req.user.userId);
  }

  // Obtener historial de transacciones
  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  async getTransactions(
    @Request() req: AuthenticatedRequest,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('type') type?: string,
  ) {
    return this.walletService.getTransactionHistory(
      req.user.userId,
      parseInt(page),
      parseInt(limit),
      type,
    );
  }

  // Verificar si puede operar
  @Get('can-operate')
  @UseGuards(JwtAuthGuard)
  async canOperate(@Request() req: AuthenticatedRequest) {
    const canOperate = await this.walletService.hasEnoughCredits(
      req.user.userId,
    );
    return {
      canOperate,
      requiredAmount: this.platformConfig.platformFee,
    };
  }
}
