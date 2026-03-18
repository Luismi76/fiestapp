import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WalletService, MIN_TOPUP, PLATFORM_FEE } from './wallet.service';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('wallet')
export class WalletController {
  private readonly logger = new Logger(WalletController.name);

  constructor(private readonly walletService: WalletService) {}

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

  // Crear formulario de pago Redsys para recarga
  @Post('topup')
  @UseGuards(JwtAuthGuard)
  async createTopUp(
    @Request() req: AuthenticatedRequest,
    @Body() body: { amount?: number },
  ) {
    const amount = body.amount || MIN_TOPUP;
    return this.walletService.createTopUpForm(req.user.userId, amount);
  }

  // Notificación de Redsys (webhook) - SIN autenticación JWT
  @Post('redsys-notification')
  async redsysNotification(
    @Body()
    body: {
      Ds_SignatureVersion: string;
      Ds_MerchantParameters: string;
      Ds_Signature: string;
    },
  ) {
    this.logger.log('Received Redsys notification');
    try {
      await this.walletService.handleRedsysNotification(body);
    } catch (error) {
      this.logger.error('Error processing Redsys notification:', error);
    }
    // Siempre responder 200 para que Redsys no reintente
    return 'OK';
  }

  // Verificar resultado de un pedido (llamado desde el frontend al volver de Redsys)
  @Get('topup-result')
  @UseGuards(JwtAuthGuard)
  async checkTopUpResult(
    @Request() req: AuthenticatedRequest,
    @Query('orderId') orderId: string,
  ) {
    return this.walletService.checkTopUpResult(orderId, req.user.userId);
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
