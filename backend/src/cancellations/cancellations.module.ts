import { Module } from '@nestjs/common';
import { CancellationsService } from './cancellations.service';
import { CancellationsController } from './cancellations.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CancellationsService],
  controllers: [CancellationsController],
  exports: [CancellationsService],
})
export class CancellationsModule {}
