import { Module, OnModuleInit } from '@nestjs/common';
import { BadgesController } from './badges.controller';
import { BadgesService } from './badges.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [BadgesController],
  providers: [BadgesService],
  exports: [BadgesService],
})
export class BadgesModule implements OnModuleInit {
  constructor(private badgesService: BadgesService) {}

  async onModuleInit() {
    // Seed badges predefinidos al iniciar el modulo
    await this.badgesService.seedBadges();
  }
}
