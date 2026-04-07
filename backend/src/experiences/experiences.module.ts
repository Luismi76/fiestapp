import { Module } from '@nestjs/common';
import { ExperiencesController } from './experiences.controller';
import { ExperiencesService } from './experiences.service';
import { PricingService } from './pricing.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CancellationsModule } from '../cancellations/cancellations.module';

@Module({
  imports: [PrismaModule, CancellationsModule],
  controllers: [ExperiencesController],
  providers: [ExperiencesService, PricingService],
  exports: [ExperiencesService, PricingService],
})
export class ExperiencesModule {}
