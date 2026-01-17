import { Module } from '@nestjs/common';
import { FestivalsController } from './festivals.controller';
import { FestivalsService } from './festivals.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FestivalsController],
  providers: [FestivalsService],
  exports: [FestivalsService],
})
export class FestivalsModule {}
