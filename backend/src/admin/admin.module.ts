import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { FinancialReportService } from './financial-report.service';
import { AccountingService } from './accounting.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CancellationsModule } from '../cancellations/cancellations.module';
import { WalletModule } from '../wallet/wallet.module';
import { MatchesModule } from '../matches/matches.module';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    CancellationsModule,
    WalletModule,
    ConfigModule,
    forwardRef(() => MatchesModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, FinancialReportService, AccountingService],
  exports: [AdminService, FinancialReportService, AccountingService],
})
export class AdminModule {}
