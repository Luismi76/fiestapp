import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StripeIdempotencyService } from '../common/stripe-idempotency.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [WalletController],
  providers: [WalletService, StripeIdempotencyService],
  exports: [WalletService],
})
export class WalletModule {}
