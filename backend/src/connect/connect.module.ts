import { Module } from '@nestjs/common';
import { ConnectController } from './connect.controller';
import { ConnectService } from './connect.service';
import { PrismaService } from '../prisma/prisma.service';
import { StripeIdempotencyService } from '../common/stripe-idempotency.service';

@Module({
  controllers: [ConnectController],
  providers: [ConnectService, PrismaService, StripeIdempotencyService],
  exports: [ConnectService],
})
export class ConnectModule {}
