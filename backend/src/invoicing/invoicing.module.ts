import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InvoiceSeriesSeeder } from './invoice-series.seeder';
import { TaxService } from './tax.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [InvoiceSeriesSeeder, TaxService],
  exports: [TaxService],
})
export class InvoicingModule {}
