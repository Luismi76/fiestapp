import { Module } from '@nestjs/common';
import { FestivalsController } from './festivals.controller';
import { FestivalsService } from './festivals.service';
import { ICalService } from './ical.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FestivalsController],
  providers: [FestivalsService, ICalService],
  exports: [FestivalsService, ICalService],
})
export class FestivalsModule {}
