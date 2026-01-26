import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WalletService, MIN_TOPUP, PLATFORM_FEE } from './wallet.service';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  // Obtener información del monedero
  @Get()
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

  // Crear intención de pago para recarga
  @Post('topup')
  async createTopUp(
    @Request() req: AuthenticatedRequest,
    @Body() body: { amount?: number },
  ) {
    const amount = body.amount || MIN_TOPUP;
    return this.walletService.createTopUpIntent(req.user.userId, amount);
  }

  // Confirmar recarga después del pago
  @Post('topup/confirm')
  async confirmTopUp(@Body() body: { paymentIntentId: string }) {
    await this.walletService.confirmTopUp(body.paymentIntentId);
    return { success: true, message: 'Recarga completada correctamente' };
  }

  // Obtener historial de transacciones
  @Get('transactions')
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
