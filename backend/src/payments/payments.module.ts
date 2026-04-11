import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StripeIdempotencyService } from '../common/stripe-idempotency.service';
import { ConnectModule } from '../connect/connect.module';
import { PlatformConfigModule } from '../platform-config/platform-config.module';

@Module({
  imports: [PrismaModule, ConfigModule, ConnectModule, PlatformConfigModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, StripeIdempotencyService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
