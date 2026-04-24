import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InvoiceSeriesSeeder } from './invoice-series.seeder';

@Module({
  imports: [PrismaModule],
  providers: [InvoiceSeriesSeeder],
  exports: [],
})
export class InvoicingModule {}
