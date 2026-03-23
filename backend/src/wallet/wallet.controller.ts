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
import { WalletService, MIN_TOPUP, PLATFORM_FEE } from './wallet.service';
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
    const canOperate = wallet.balance >= PLATFORM_FEE;

    return {
      balance: wallet.balance,
      canOperate,
      platformFee: PLATFORM_FEE,
      minTopUp: MIN_TOPUP,
      operationsAvailable: Math.floor(wallet.balance / PLATFORM_FEE),
    };
  }

  // Crear sesión de Stripe Checkout para recarga
  @Post('topup')
  @UseGuards(JwtAuthGuard)
  async createTopUp(
    @Request() req: AuthenticatedRequest,
    @Body() body: { amount?: number },
  ) {
    const amount = body.amount || MIN_TOPUP;
    return this.walletService.createTopUpSession(req.user.userId, amount);
  }

  // Webhook de Stripe para recargas - SIN autenticación JWT
  @Post('stripe-webhook')
  async stripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

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

  // Verificar resultado de un pedido (llamado desde el frontend al volver de Stripe)
  @Get('topup-result')
  @UseGuards(JwtAuthGuard)
  async checkTopUpResult(
    @Request() req: AuthenticatedRequest,
    @Query('sessionId') sessionId: string,
  ) {
    return this.walletService.checkTopUpResult(sessionId, req.user.userId);
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
    const hasBalance = await this.walletService.hasEnoughBalance(
      req.user.userId,
    );
    return {
      canOperate: hasBalance,
      requiredAmount: PLATFORM_FEE,
    };
  }
}
