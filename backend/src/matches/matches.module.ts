import { Module, forwardRef } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { MatchesController } from './matches.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ExperiencesModule } from '../experiences/experiences.module';
import { CancellationsModule } from '../cancellations/cancellations.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    PrismaModule,
    WalletModule,
    forwardRef(() => UsersModule),
    NotificationsModule,
    ExperiencesModule,
    CancellationsModule,
    EmailModule,
  ],
  controllers: [MatchesController],
  providers: [MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}
