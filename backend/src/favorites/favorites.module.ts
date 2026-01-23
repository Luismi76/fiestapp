import { Module } from '@nestjs/common';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';
import { AvailabilityAlertService } from './availability-alert.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [FavoritesController],
  providers: [FavoritesService, AvailabilityAlertService],
  exports: [FavoritesService, AvailabilityAlertService],
})
export class FavoritesModule {}
