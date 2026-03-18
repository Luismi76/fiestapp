import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedsysService } from '../redsys/redsys.service';

// Constantes del modelo de negocio
export const PLATFORM_FEE = 1.5; // 1,50€ por operación
export const MIN_TOPUP = 4.5; // 4,50€ mínimo de recarga (3 operaciones)

export type TransactionType = 'topup' | 'platform_fee' | 'refund';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private frontendUrl: string;
  private backendUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private redsysService: RedsysService,
  ) {
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'http://localhost:3000';
    // Derivar la URL del backend desde FRONTEND_URL
    const apiUrl =
      this.configService.get<string>('BACKEND_URL') ||
      this.frontendUrl.replace('fiestapp.lmsc.es', 'fiestapp-api.lmsc.es');
    this.backendUrl = apiUrl.replace(/\/api$/, '');
  }

  // Obtener monedero del usuario
  async getWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      // Crear monedero si no existe (para usuarios antiguos)
      return this.prisma.wallet.create({
        data: { userId, balance: 0 },
      });
    }

    return wallet;
  }

  // Obtener saldo
  async getBalance(userId: string): Promise<number> {
    const wallet = await this.getWallet(userId);
    return wallet.balance;
  }

  // Verificar si tiene saldo suficiente
  async hasEnoughBalance(
    userId: string,
    amount: number = PLATFORM_FEE,
  ): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance >= amount;
  }

  // Crear formulario de pago Redsys para recarga
  async createTopUpForm(
    userId: string,
    amount: number = MIN_TOPUP,
  ): Promise<{
    redsysUrl: string;
    redsysBody: {
      Ds_SignatureVersion: string;
      Ds_MerchantParameters: string;
      Ds_Signature: string;
    };
    orderId: string;
  }> {
    if (amount < MIN_TOPUP) {
      throw new BadRequestException(`La recarga mínima es de ${MIN_TOPUP}€`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Cancelar transacciones pendientes antiguas (más de 30 minutos)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    await this.prisma.transaction.updateMany({
      where: {
        userId,
        type: 'topup',
        status: 'pending',
        createdAt: { lt: thirtyMinutesAgo },
      },
      data: { status: 'cancelled' },
    });

    const orderId = this.redsysService.generateOrderId();

    // Registrar transacción pendiente
    await this.prisma.transaction.create({
      data: {
        userId,
        type: 'topup',
        amount,
        status: 'pending',
        stripeId: orderId, // Reutilizamos el campo para almacenar el orderId de Redsys
        description: `Recarga de monedero: ${amount}€`,
      },
    });

    const form = this.redsysService.createPaymentForm({
      orderId,
      amount,
      description: `FiestApp Recarga ${amount}€`,
      merchantData: JSON.stringify({ userId, type: 'wallet_topup' }),
      successUrl: `${this.frontendUrl}/wallet/topup-result?status=success&order=${orderId}`,
      errorUrl: `${this.frontendUrl}/wallet/topup-result?status=error&order=${orderId}`,
      notificationUrl: `${this.backendUrl}/api/wallet/redsys-notification`,
    });

    this.logger.debug(
      `TopUp form created: orderId=${orderId}, amount=${amount}€, user=${userId}`,
    );

    return {
      redsysUrl: form.url,
      redsysBody: form.body,
      orderId,
    };
  }

  // Procesar notificación de Redsys (webhook)
  async handleRedsysNotification(body: {
    Ds_SignatureVersion: string;
    Ds_MerchantParameters: string;
    Ds_Signature: string;
  }): Promise<void> {
    const notification = this.redsysService.processNotification(body);

    const orderId = notification.Ds_Order;
    const responseCode = notification.Ds_Response;

    this.logger.log(
      `Redsys notification: order=${orderId}, response=${responseCode}`,
    );

    if (!orderId) {
      this.logger.warn('Notification without order ID');
      return;
    }

    const transaction = await this.prisma.transaction.findFirst({
      where: { stripeId: orderId, type: 'topup' },
    });

    if (!transaction) {
      this.logger.warn(`Transaction not found for order: ${orderId}`);
      return;
    }

    if (transaction.status === 'completed') {
      this.logger.debug(`Transaction already completed: ${orderId}`);
      return;
    }

    if (this.redsysService.isSuccessResponse(responseCode || '')) {
      // Pago exitoso - actualizar saldo
      await this.prisma.$transaction(async (tx) => {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: { status: 'completed' },
        });

        await tx.wallet.upsert({
          where: { userId: transaction.userId },
          update: { balance: { increment: transaction.amount } },
          create: { userId: transaction.userId, balance: transaction.amount },
        });
      });

      this.logger.log(
        `TopUp completed: order=${orderId}, amount=${transaction.amount}€, user=${transaction.userId}`,
      );
    } else {
      // Pago fallido
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'cancelled' },
      });

      this.logger.warn(
        `TopUp failed: order=${orderId}, response=${responseCode}`,
      );
    }
  }

  // Verificar resultado de un pedido (llamado desde el frontend al volver de Redsys)
  async checkTopUpResult(
    orderId: string,
    userId: string,
  ): Promise<{ success: boolean; amount?: number }> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { stripeId: orderId, type: 'topup', userId },
    });

    if (!transaction) {
      return { success: false };
    }

    return {
      success: transaction.status === 'completed',
      amount: transaction.amount,
    };
  }

  // Añadir saldo al monedero (para reembolsos)
  async addBalance(
    userId: string,
    amount: number,
    description: string,
    matchId?: string,
  ): Promise<void> {
    if (amount <= 0) {
      throw new BadRequestException('El monto debe ser positivo');
    }

    await this.prisma.$transaction(async (tx) => {
      // Añadir al monedero
      await tx.wallet.upsert({
        where: { userId },
        update: { balance: { increment: amount } },
        create: { userId, balance: amount },
      });

      // Registrar transacción de reembolso
      await tx.transaction.create({
        data: {
          userId,
          matchId,
          type: 'refund',
          amount,
          status: 'completed',
          description,
        },
      });
    });

    this.logger.log(`Reembolso de ${amount}€ añadido a usuario ${userId}`);
  }

  // Descontar tarifa de plataforma (llamado al cerrar acuerdo)
  async deductPlatformFee(
    userId: string,
    matchId: string,
    experienceTitle: string,
    role: 'host' | 'guest',
    otherUserId: string,
    otherUserName: string,
  ): Promise<void> {
    const wallet = await this.getWallet(userId);

    if (wallet.balance < PLATFORM_FEE) {
      throw new BadRequestException(
        `Saldo insuficiente. Necesitas ${PLATFORM_FEE}€ para completar esta operación.`,
      );
    }

    // Descripción clara: Experiencia + con quién
    const description =
      role === 'host'
        ? `${experienceTitle} · ${otherUserName}`
        : `${experienceTitle} · con ${otherUserName}`;

    await this.prisma.$transaction(async (tx) => {
      // Descontar del monedero
      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: PLATFORM_FEE } },
      });

      // Registrar transacción
      await tx.transaction.create({
        data: {
          userId,
          matchId,
          otherUserId,
          type: 'platform_fee',
          amount: -PLATFORM_FEE,
          status: 'completed',
          description,
        },
      });
    });
  }

  // Obtener historial de transacciones del monedero
  async getTransactionHistory(
    userId: string,
    page = 1,
    limit = 20,
    type?: string,
  ) {
    const skip = (page - 1) * limit;

    // Tipos validos para filtrar
    const validTypes = ['topup', 'platform_fee', 'refund'];
    const filterType = type && validTypes.includes(type) ? type : null;

    // Filtro: mostrar transacciones completadas (topups, fees, refunds)
    // No mostrar pendientes ni canceladas
    let whereClause: object;

    if (filterType) {
      // Filtro por tipo especifico
      whereClause = {
        userId,
        type: filterType,
        status: 'completed',
      };
    } else {
      // Todos los tipos completados
      whereClause = {
        userId,
        OR: [
          // Topups solo completados
          { type: 'topup', status: 'completed' },
          // Platform fees (siempre completados)
          { type: 'platform_fee', status: 'completed' },
          // Refunds completados
          { type: 'refund', status: 'completed' },
        ],
      };
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({
        where: whereClause,
      }),
    ]);

    // Obtener información del otro usuario para transacciones de platform_fee
    const otherUserIds = transactions
      .filter((tx) => tx.otherUserId)
      .map((tx) => tx.otherUserId as string);

    const otherUsers =
      otherUserIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: otherUserIds } },
            select: { id: true, name: true, avatar: true },
          })
        : [];

    const otherUsersMap = new Map(otherUsers.map((u) => [u.id, u]));

    // Enriquecer transacciones con datos del otro usuario
    const enrichedTransactions = transactions.map((tx) => ({
      ...tx,
      otherUser: tx.otherUserId ? otherUsersMap.get(tx.otherUserId) : null,
    }));

    return {
      transactions: enrichedTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
