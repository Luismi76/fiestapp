import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ExperiencesModule } from './experiences/experiences.module';
import { FestivalsModule } from './festivals/festivals.module';
import { MatchesModule } from './matches/matches.module';
import { ReviewsModule } from './reviews/reviews.module';
import { UsersModule } from './users/users.module';
import { UploadsModule } from './uploads/uploads.module';
import { StorageModule } from './storage/storage.module';
import { PaymentsModule } from './payments/payments.module';
import { WalletModule } from './wallet/wallet.module';
import { FavoritesModule } from './favorites/favorites.module';
import { ChatModule } from './chat/chat.module';
import { RemindersModule } from './reminders/reminders.module';
import { AdminModule } from './admin/admin.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BadgesModule } from './badges/badges.module';
import { DiscountsModule } from './discounts/discounts.module';
import { ReferralsModule } from './referrals/referrals.module';
import { AuditModule } from './audit/audit.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { CacheConfigModule } from './cache/cache.module';
import { SentryModule } from './sentry/sentry.module';
import { SentryExceptionFilter } from './sentry/sentry-exception.filter';
import { EmailModule } from './email/email.module';
import { SearchModule } from './search/search.module';
import { CancellationsModule } from './cancellations/cancellations.module';
import { DisputesModule } from './disputes/disputes.module';
import { VerificationModule } from './verification/verification.module';
import { CurrencyModule } from './currency/currency.module';
import { GdprModule } from './gdpr/gdpr.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    EmailModule,
    // Rate Limiting global: 100 peticiones por minuto
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 segundo
        limit: 10, // 10 peticiones por segundo
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minuto
        limit: 100, // 100 peticiones por minuto
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hora
        limit: 1000, // 1000 peticiones por hora
      },
    ]),
    StorageModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    ExperiencesModule,
    FestivalsModule,
    MatchesModule,
    ReviewsModule,
    UploadsModule,
    PaymentsModule,
    WalletModule,
    FavoritesModule,
    ChatModule,
    RemindersModule,
    AdminModule,
    ReportsModule,
    NotificationsModule,
    BadgesModule,
    DiscountsModule,
    ReferralsModule,
    AuditModule,
    CacheConfigModule,
    SentryModule,
    SearchModule,
    CancellationsModule,
    DisputesModule,
    VerificationModule,
    CurrencyModule,
    GdprModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Aplicar rate limiting globalmente
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Interceptor de auditoria para loggear acciones criticas
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    // Filtro global de excepciones con Sentry
    {
      provide: APP_FILTER,
      useClass: SentryExceptionFilter,
    },
  ],
})
export class AppModule {}
