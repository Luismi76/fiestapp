import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StripeIdempotencyService } from '../common/stripe-idempotency.service';
import Stripe from 'stripe';

@Injectable()
export class ConnectService {
  private readonly logger = new Logger(ConnectService.name);
  private stripe: Stripe | null = null;
  private frontendUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private stripeIdempotency: StripeIdempotencyService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey);
    } else {
      this.logger.warn('STRIPE_SECRET_KEY not configured - Connect disabled');
    }
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  private ensureStripe(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException(
        'Stripe no configurado. Contacta al administrador.',
      );
    }
    return this.stripe;
  }

  /**
   * Crear cuenta Express de Stripe Connect para un host
   */
  async createConnectAccount(userId: string): Promise<{ accountId: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        stripeConnectAccountId: true,
        taxId: true,
      },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    // Si ya tiene cuenta, devolver el ID existente
    if (user.stripeConnectAccountId) {
      return { accountId: user.stripeConnectAccountId };
    }

    const account = await this.ensureStripe().accounts.create({
      type: 'express',
      country: 'ES',
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata: {
        userId: user.id,
        platform: 'fiestapp',
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeConnectAccountId: account.id },
    });

    this.logger.log(
      `Stripe Connect account created: ${account.id} for user ${userId}`,
    );

    return { accountId: account.id };
  }

  /**
   * Generar link de onboarding (redirige a Stripe para completar verificación)
   */
  async createAccountLink(userId: string): Promise<{ url: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeConnectAccountId: true },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (!user.stripeConnectAccountId) {
      throw new BadRequestException(
        'Primero debes crear una cuenta de cobros.',
      );
    }

    const accountLink = await this.ensureStripe().accountLinks.create({
      account: user.stripeConnectAccountId,
      refresh_url: `${this.frontendUrl}/connect/refresh`,
      return_url: `${this.frontendUrl}/connect/return`,
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  }

  /**
   * Consultar estado de la cuenta Connect del host
   */
  async getAccountStatus(userId: string): Promise<{
    hasAccount: boolean;
    onboarded: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        stripeConnectAccountId: true,
        stripeConnectOnboarded: true,
        stripeConnectPayoutsEnabled: true,
      },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (!user.stripeConnectAccountId) {
      return {
        hasAccount: false,
        onboarded: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      };
    }

    // Consultar estado actualizado desde Stripe
    try {
      const account = await this.ensureStripe().accounts.retrieve(
        user.stripeConnectAccountId,
      );

      const onboarded = account.details_submitted ?? false;
      const payoutsEnabled = account.payouts_enabled ?? false;

      // Actualizar BD si cambió
      if (
        onboarded !== user.stripeConnectOnboarded ||
        payoutsEnabled !== user.stripeConnectPayoutsEnabled
      ) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            stripeConnectOnboarded: onboarded,
            stripeConnectPayoutsEnabled: payoutsEnabled,
          },
        });
      }

      return {
        hasAccount: true,
        onboarded,
        payoutsEnabled,
        detailsSubmitted: account.details_submitted ?? false,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to retrieve Connect account for user ${userId}: ${error}`,
      );
      return {
        hasAccount: true,
        onboarded: user.stripeConnectOnboarded,
        payoutsEnabled: user.stripeConnectPayoutsEnabled,
        detailsSubmitted: user.stripeConnectOnboarded,
      };
    }
  }

  /**
   * Crear Transfer de la plataforma a la cuenta conectada del host
   */
  async createTransferToHost(
    hostId: string,
    amount: number,
    matchId: string,
    description: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: hostId },
      select: {
        stripeConnectAccountId: true,
        stripeConnectPayoutsEnabled: true,
      },
    });

    if (!user?.stripeConnectAccountId) {
      throw new BadRequestException(
        'El anfitrión no tiene cuenta de cobros configurada.',
      );
    }

    if (!user.stripeConnectPayoutsEnabled) {
      throw new BadRequestException(
        'La cuenta de cobros del anfitrión no está verificada.',
      );
    }

    const amountInCents = Math.round(amount * 100);

    const transfer = await this.ensureStripe().transfers.create({
      amount: amountInCents,
      currency: 'eur',
      destination: user.stripeConnectAccountId,
      description,
      metadata: {
        matchId,
        hostId,
        platform: 'fiestapp',
      },
    });

    this.logger.log(
      `Transfer created: ${transfer.id}, amount=${amount}€, host=${hostId}, match=${matchId}`,
    );
  }

  /**
   * Generar link al dashboard Express del host
   */
  async createDashboardLink(userId: string): Promise<{ url: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeConnectAccountId: true },
    });

    if (!user?.stripeConnectAccountId) {
      throw new BadRequestException(
        'No tienes cuenta de cobros configurada.',
      );
    }

    const loginLink = await this.ensureStripe().accounts.createLoginLink(
      user.stripeConnectAccountId,
    );

    return { url: loginLink.url };
  }

  /**
   * Procesar webhook de Stripe Connect (account.updated)
   */
  async handleConnectWebhook(event: Stripe.Event): Promise<void> {
    if (
      await this.stripeIdempotency.isAlreadyProcessed(event.id, event.type)
    ) {
      return;
    }

    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await this.handleAccountUpdated(account);
        break;
      }
      default:
        this.logger.debug(`Connect webhook ignored: ${event.type}`);
    }
  }

  private async handleAccountUpdated(account: Stripe.Account): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { stripeConnectAccountId: account.id },
    });

    if (!user) {
      this.logger.warn(
        `Connect account.updated: no user found for account ${account.id}`,
      );
      return;
    }

    const onboarded = account.details_submitted ?? false;
    const payoutsEnabled = account.payouts_enabled ?? false;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        stripeConnectOnboarded: onboarded,
        stripeConnectPayoutsEnabled: payoutsEnabled,
      },
    });

    this.logger.log(
      `Connect account updated: user=${user.id}, onboarded=${onboarded}, payouts=${payoutsEnabled}`,
    );
  }
}
