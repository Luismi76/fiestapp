import { Module } from '@nestjs/common';
import { DisputesService } from './disputes.service';
import {
  DisputesController,
  AdminDisputesController,
} from './disputes.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, WalletModule, EmailModule, NotificationsModule],
  providers: [DisputesService],
  controllers: [DisputesController, AdminDisputesController],
  exports: [DisputesService],
})
export class DisputesModule {}
