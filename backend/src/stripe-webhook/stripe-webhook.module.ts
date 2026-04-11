import { Module } from '@nestjs/common';
import { StripeWebhookController } from './stripe-webhook.controller';
import { WalletModule } from '../wallet/wallet.module';
import { MatchesModule } from '../matches/matches.module';
import { PaymentsModule } from '../payments/payments.module';
import { ConnectModule } from '../connect/connect.module';

@Module({
  imports: [WalletModule, MatchesModule, PaymentsModule, ConnectModule],
  controllers: [StripeWebhookController],
})
export class StripeWebhookModule {}
