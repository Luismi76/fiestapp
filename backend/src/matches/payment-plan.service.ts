import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { StripeIdempotencyService } from '../common/stripe-idempotency.service';
import Stripe from 'stripe';

/**
 * Gestión de planes de pago en dos plazos (depósito + saldo).
 * Para reservas con mucha antelación (>90 días típicamente).
 *
 * Flujo:
 * 1. Al reservar: viajero paga depósito (Destination Charge con on_behalf_of del host)
 *    + setup_future_usage='off_session' para guardar la tarjeta.
 * 2. En la fecha balanceDueDate (cron): se cobra el saldo usando la tarjeta guardada
 *    (off-session, sin interacción del viajero).
 * 3. Si el cargo falla, se notifica al viajero para actualizar el método de pago.
 */
@Injectable()
export class PaymentPlanService {
  private readonly logger = new Logger(PaymentPlanService.name);
  private stripe: Stripe | null = null;
  private frontendUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private platformConfig: PlatformConfigService,
    private stripeIdempotency: StripeIdempotencyService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey);
    }
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  private ensureStripe(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException(
        'Pagos no configurados. Contacta al administrador.',
      );
    }
    return this.stripe;
  }

  /**
   * Verifica si una experiencia admite reserva con depósito según su fecha.
   */
  canUseDeposit(
    experience: {
      depositEnabled: boolean;
      balanceDaysBefore: number;
    },
    startDate: Date | null,
  ): boolean {
    if (!experience.depositEnabled || !startDate) return false;
    const daysUntil = Math.ceil(
      (startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    // Solo permitir depósito si la experiencia es lo bastante lejana para
    // que el cargo del saldo (balanceDaysBefore antes) deje margen razonable
    return daysUntil > experience.balanceDaysBefore;
  }

  /**
   * Crear Checkout Session para el depósito de una reserva.
   * Usa Destination Charge (on_behalf_of host) + setup_future_usage off_session
   * para guardar la tarjeta para el cargo posterior del saldo.
   */
  async createDepositCheckout(matchId: string, requesterId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        experience: {
          select: {
            title: true,
            depositEnabled: true,
            depositPercentage: true,
            balanceDaysBefore: true,
          },
        },
        host: {
          select: {
            stripeConnectAccountId: true,
            stripeConnectPayoutsEnabled: true,
          },
        },
        requester: { select: { email: true, name: true } },
        paymentPlan: true,
      },
    });

    if (!match) throw new NotFoundException('Solicitud no encontrada');
    if (match.requesterId !== requesterId) {
      throw new ForbiddenException('Solo el viajero puede realizar el pago');
    }
    if (
      match.status !== 'accepted' ||
      match.paymentStatus !== 'pending_payment'
    ) {
      throw new BadRequestException('Esta solicitud no requiere pago');
    }
    if (!match.totalPrice || match.totalPrice <= 0) {
      throw new BadRequestException('Esta experiencia no tiene precio');
    }
    if (!match.experience.depositEnabled) {
      throw new BadRequestException(
        'Esta experiencia no admite reserva con depósito',
      );
    }
    if (!this.canUseDeposit(match.experience, match.startDate)) {
      throw new BadRequestException(
        'La experiencia está demasiado próxima para reservar con depósito',
      );
    }
    if (
      !match.host.stripeConnectAccountId ||
      !match.host.stripeConnectPayoutsEnabled
    ) {
      throw new BadRequestException(
        'El anfitrión aún no ha configurado su cuenta de cobros',
      );
    }
    if (match.paymentPlan && match.paymentPlan.depositPaid) {
      throw new BadRequestException('El depósito ya ha sido pagado');
    }

    const stripe = this.ensureStripe();

    // Calcular importes
    const total = match.totalPrice;
    const depositPct = match.experience.depositPercentage;
    const depositAmount = Math.round(total * (depositPct / 100) * 100) / 100;
    const balanceAmount = Math.round((total - depositAmount) * 100) / 100;

    // Fecha de cobro del saldo
    const balanceDueDate = new Date(match.startDate!);
    balanceDueDate.setDate(
      balanceDueDate.getDate() - match.experience.balanceDaysBefore,
    );

    // Crear o obtener Stripe Customer (para guardar el método de pago)
    let customerId = match.paymentPlan?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: match.requester.email,
        name: match.requester.name,
        metadata: { userId: match.requesterId, matchId },
      });
      customerId = customer.id;
    }

    // Crear Checkout Session con destination charge + setup_future_usage
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${match.experience.title} - Depósito (${depositPct}%)`,
              description: `Reserva con depósito. Saldo de ${balanceAmount.toFixed(2)}€ se cargará el ${balanceDueDate.toLocaleDateString('es-ES')}.`,
            },
            unit_amount: Math.round(depositAmount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        matchId,
        requesterId,
        type: 'deposit_payment',
        depositAmount: depositAmount.toString(),
        balanceAmount: balanceAmount.toString(),
        balanceDueDate: balanceDueDate.toISOString(),
      },
      payment_intent_data: {
        capture_method: 'automatic',
        setup_future_usage: 'off_session',
        on_behalf_of: match.host.stripeConnectAccountId,
        transfer_data: {
          destination: match.host.stripeConnectAccountId,
        },
        metadata: {
          matchId,
          requesterId,
          type: 'deposit_payment',
        },
      },
      success_url: `${this.frontendUrl}/matches/payment-result?status=success&session_id={CHECKOUT_SESSION_ID}&matchId=${matchId}`,
      cancel_url: `${this.frontendUrl}/matches/payment-result?status=error&matchId=${matchId}`,
    });

    // Crear/actualizar PaymentPlan (status=pending hasta confirmar webhook)
    await this.prisma.paymentPlan.upsert({
      where: { matchId },
      create: {
        matchId,
        totalAmount: total,
        depositAmount,
        balanceAmount,
        balanceDueDate,
        stripeCustomerId: customerId,
        status: 'pending',
      },
      update: {
        totalAmount: total,
        depositAmount,
        balanceAmount,
        balanceDueDate,
        stripeCustomerId: customerId,
        status: 'pending',
      },
    });

    // Crear transacción pendiente
    await this.prisma.transaction.create({
      data: {
        userId: requesterId,
        matchId,
        type: 'experience_payment',
        amount: -depositAmount,
        status: 'pending',
        stripeId: session.id,
        description: `Depósito experiencia: ${match.experience.title}`,
      },
    });

    return {
      sessionUrl: session.url,
      sessionId: session.id,
    };
  }

  /**
   * Procesa el webhook cuando el depósito se completa.
   * Guarda el payment method para el cargo off-session posterior.
   */
  async handleDepositWebhook(event: Stripe.Event): Promise<void> {
    if (event.type !== 'checkout.session.completed') return;

    const session = event.data.object;
    if (session.metadata?.type !== 'deposit_payment') return;

    if (await this.stripeIdempotency.isAlreadyProcessed(event.id, event.type)) {
      return;
    }

    const matchId = session.metadata.matchId;
    if (!matchId) return;

    const plan = await this.prisma.paymentPlan.findUnique({
      where: { matchId },
    });
    if (!plan || plan.depositPaid) return;

    if (session.payment_status !== 'paid') {
      await this.prisma.paymentPlan.update({
        where: { matchId },
        data: { status: 'failed' },
      });
      return;
    }

    const stripe = this.ensureStripe();

    // Recuperar el payment intent para obtener el payment_method guardado
    const paymentIntentId = session.payment_intent as string;
    let savedPaymentMethodId: string | null = null;
    if (paymentIntentId) {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
      savedPaymentMethodId =
        typeof pi.payment_method === 'string'
          ? pi.payment_method
          : (pi.payment_method?.id ?? null);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.paymentPlan.update({
        where: { matchId },
        data: {
          depositPaid: true,
          depositPaidAt: new Date(),
          depositStripePaymentId: paymentIntentId,
          stripePaymentMethodId: savedPaymentMethodId,
          status: 'active',
        },
      });

      // Marcar la transacción del depósito como released
      await tx.transaction.updateMany({
        where: { matchId, type: 'experience_payment', status: 'pending' },
        data: { status: 'released', stripeId: paymentIntentId },
      });

      await tx.match.update({
        where: { id: matchId },
        data: { paymentStatus: 'released' },
      });
    });

    this.logger.log(
      `Deposit payment confirmed for match ${matchId}, balance scheduled for ${plan.balanceDueDate.toISOString()}`,
    );
  }

  /**
   * Cargar el saldo pendiente off-session usando la tarjeta guardada.
   * Llamado desde el cron diario.
   */
  async chargeBalance(planId: string): Promise<{
    success: boolean;
    status: 'succeeded' | 'requires_action' | 'host_disabled' | 'failed';
    error?: string;
    clientSecret?: string;
  }> {
    const plan = await this.prisma.paymentPlan.findUnique({
      where: { id: planId },
      include: {
        match: {
          include: {
            host: {
              select: {
                stripeConnectAccountId: true,
                stripeConnectPayoutsEnabled: true,
              },
            },
            requester: { select: { email: true, name: true } },
            experience: { select: { title: true } },
          },
        },
      },
    });

    if (!plan) throw new NotFoundException('Plan de pago no encontrado');
    if (plan.balancePaid) {
      return { success: true, status: 'succeeded' };
    }
    if (!plan.stripePaymentMethodId || !plan.stripeCustomerId) {
      throw new BadRequestException('Plan sin método de pago guardado');
    }

    // Re-validar Connect activo. Si el host lo deshabilitó tras el depósito,
    // no podemos cobrar el saldo. Marcamos el plan como host_disabled para
    // que admin tome acción manual (refund del depósito o resolución).
    if (
      !plan.match.host.stripeConnectAccountId ||
      !plan.match.host.stripeConnectPayoutsEnabled
    ) {
      this.logger.warn(
        `Host de plan ${plan.id} ha deshabilitado Connect. Cancelando plan y refund pendiente.`,
      );
      await this.prisma.paymentPlan.update({
        where: { id: plan.id },
        data: {
          status: 'failed',
          balanceFailureReason:
            'host_connect_disabled: el anfitrión deshabilitó su cuenta de cobros',
          balanceLastRetryAt: new Date(),
        },
      });
      return {
        success: false,
        status: 'host_disabled',
        error: 'El anfitrión no tiene cuenta de cobros activa',
      };
    }

    const stripe = this.ensureStripe();

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(plan.balanceAmount * 100),
        currency: 'eur',
        customer: plan.stripeCustomerId,
        payment_method: plan.stripePaymentMethodId,
        off_session: true,
        confirm: true,
        on_behalf_of: plan.match.host.stripeConnectAccountId,
        transfer_data: {
          destination: plan.match.host.stripeConnectAccountId,
        },
        description: `Saldo experiencia: ${plan.match.experience.title}`,
        metadata: {
          matchId: plan.matchId,
          type: 'balance_payment',
          paymentPlanId: plan.id,
        },
      });

      if (paymentIntent.status === 'succeeded') {
        await this.prisma.$transaction(async (tx) => {
          await tx.paymentPlan.update({
            where: { id: plan.id },
            data: {
              balancePaid: true,
              balancePaidAt: new Date(),
              balanceStripePaymentId: paymentIntent.id,
              status: 'completed',
              balanceFailureReason: null,
            },
          });

          await tx.transaction.create({
            data: {
              userId: plan.match.requesterId,
              matchId: plan.matchId,
              type: 'experience_payment',
              amount: -plan.balanceAmount,
              status: 'released',
              stripeId: paymentIntent.id,
              description: `Saldo experiencia: ${plan.match.experience.title}`,
            },
          });
        });

        this.logger.log(
          `Balance charged successfully for plan ${plan.id}: ${plan.balanceAmount}€`,
        );

        return { success: true, status: 'succeeded' };
      }

      // requires_action: la tarjeta necesita autenticación 3D Secure (SCA).
      // Guardamos el client_secret para que el viajero complete la autenticación
      // desde la app y notificamos por email.
      if (paymentIntent.status === 'requires_action') {
        await this.prisma.paymentPlan.update({
          where: { id: plan.id },
          data: {
            balanceRetryCount: plan.balanceRetryCount + 1,
            balanceLastRetryAt: new Date(),
            balanceFailureReason:
              'requires_action: el viajero debe autenticar el pago (3D Secure)',
            balanceStripePaymentId: paymentIntent.id,
          },
        });

        this.logger.warn(
          `Balance ${plan.id} requires SCA authentication from traveler`,
        );

        return {
          success: false,
          status: 'requires_action',
          error: 'El viajero debe autenticar el pago manualmente',
          clientSecret: paymentIntent.client_secret ?? undefined,
        };
      }

      // Otro estado no terminal
      await this.prisma.paymentPlan.update({
        where: { id: plan.id },
        data: {
          balanceRetryCount: plan.balanceRetryCount + 1,
          balanceLastRetryAt: new Date(),
          balanceFailureReason: `Stripe status: ${paymentIntent.status}`,
        },
      });

      return {
        success: false,
        status: 'failed',
        error: `Estado Stripe: ${paymentIntent.status}`,
      };
    } catch (err) {
      // Capturamos errores de Stripe; los más comunes son:
      // - authentication_required (SCA): igual que requires_action
      // - card_declined, expired_card, insufficient_funds
      const errorMsg = err instanceof Error ? err.message : String(err);
      const stripeError = err as { code?: string };
      const isAuthRequired = stripeError.code === 'authentication_required';

      this.logger.error(
        `Failed to charge balance for plan ${plan.id}: ${errorMsg}`,
      );

      await this.prisma.paymentPlan.update({
        where: { id: plan.id },
        data: {
          balanceRetryCount: plan.balanceRetryCount + 1,
          balanceLastRetryAt: new Date(),
          balanceFailureReason: errorMsg,
        },
      });

      return {
        success: false,
        status: isAuthRequired ? 'requires_action' : 'failed',
        error: errorMsg,
      };
    }
  }

  /**
   * Listar planes que deben ser cargados ahora (cron diario)
   */
  async getPlansDueForCharge(): Promise<{ id: string }[]> {
    return this.prisma.paymentPlan.findMany({
      where: {
        status: 'active',
        balancePaid: false,
        balanceDueDate: { lte: new Date() },
        balanceRetryCount: { lt: 5 }, // Máx 5 reintentos
      },
      select: { id: true },
    });
  }

  /**
   * Cancelar un plan (refund del depósito y/o saldo si ya se pagaron).
   * Si Stripe falla por insufficient_funds (host sin saldo), se registra
   * el refund como pendiente para resolución manual del admin.
   */
  async cancelPlan(
    matchId: string,
    refundPercentage: number,
  ): Promise<{
    refundsAttempted: number;
    refundsFailed: number;
    failureReasons: string[];
  }> {
    const plan = await this.prisma.paymentPlan.findUnique({
      where: { matchId },
    });
    if (!plan) {
      return { refundsAttempted: 0, refundsFailed: 0, failureReasons: [] };
    }

    const stripe = this.ensureStripe();
    const failureReasons: string[] = [];
    let refundsAttempted = 0;
    let refundsFailed = 0;

    const tryRefund = async (
      paymentIntentId: string,
      amountCents: number,
      label: string,
    ): Promise<boolean> => {
      refundsAttempted++;
      try {
        await stripe.refunds.create({
          payment_intent: paymentIntentId,
          amount: amountCents,
          metadata: { matchId, type: label },
        });
        this.logger.log(
          `Refunded ${amountCents / 100}€ (${label}) for match ${matchId}`,
        );
        return true;
      } catch (err) {
        refundsFailed++;
        const errorMsg = err instanceof Error ? err.message : String(err);
        const stripeErr = err as { code?: string };
        const isInsufficientFunds =
          stripeErr.code === 'balance_insufficient' ||
          errorMsg.includes('insufficient');
        const reason = isInsufficientFunds
          ? `${label}: el anfitrión no tiene saldo suficiente para devolver ${amountCents / 100}€`
          : `${label}: ${errorMsg}`;
        failureReasons.push(reason);
        this.logger.error(
          `Refund FAILED for match ${matchId} (${label}): ${errorMsg}. Acción manual requerida.`,
        );
        return false;
      }
    };

    // Refund del depósito si se pagó
    if (plan.depositPaid && plan.depositStripePaymentId) {
      const refundAmount = Math.round(
        plan.depositAmount * (refundPercentage / 100) * 100,
      );
      if (refundAmount > 0) {
        await tryRefund(
          plan.depositStripePaymentId,
          refundAmount,
          'deposit_refund',
        );
      }
    }

    // Refund del saldo si se pagó
    if (plan.balancePaid && plan.balanceStripePaymentId) {
      const refundAmount = Math.round(
        plan.balanceAmount * (refundPercentage / 100) * 100,
      );
      if (refundAmount > 0) {
        await tryRefund(
          plan.balanceStripePaymentId,
          refundAmount,
          'balance_refund',
        );
      }
    }

    // Si hay refunds fallidos, marcar el plan como necesitando atención
    // pero igualmente cancelar el plan.
    const newStatus = refundsFailed > 0 ? 'failed' : 'cancelled';
    await this.prisma.paymentPlan.update({
      where: { matchId },
      data: {
        status: newStatus,
        balanceFailureReason:
          failureReasons.length > 0 ? failureReasons.join('; ') : null,
      },
    });

    return { refundsAttempted, refundsFailed, failureReasons };
  }

  /**
   * Cron diario: cobra los saldos pendientes que ya han llegado a balanceDueDate.
   * Se ejecuta todos los días a las 09:00 (hora del servidor).
   * Idempotente: registra el último día procesado para evitar doble ejecución
   * tras reinicio del servidor en la misma jornada.
   */
  private lastCronRunDate: string | null = null;

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async processBalancePayments(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // Idempotencia: si ya corrimos hoy, salimos.
    // (Protege contra reinicios del servidor en torno a las 9:00.)
    if (this.lastCronRunDate === today) {
      this.logger.debug(
        `processBalancePayments ya se ejecutó hoy (${today}), saltando`,
      );
      return;
    }

    const duePlans = await this.getPlansDueForCharge();
    if (duePlans.length === 0) {
      this.lastCronRunDate = today;
      return;
    }

    this.logger.log(`Processing ${duePlans.length} balance payments due today`);

    for (const { id } of duePlans) {
      try {
        const result = await this.chargeBalance(id);
        if (result.success) {
          this.logger.log(`Balance ${id} charged successfully`);
        } else {
          this.logger.warn(
            `Balance ${id} charge result: ${result.status} - ${result.error ?? 'unknown'}`,
          );
        }
      } catch (err) {
        this.logger.error(
          `Balance ${id} charge threw: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    this.lastCronRunDate = today;
  }
}
