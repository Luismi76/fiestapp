import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InvoiceSeriesSeeder } from './invoice-series.seeder';
import { TaxService } from './tax.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { AdminInvoiceController } from './admin-invoice.controller';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [InvoiceController, AdminInvoiceController],
  providers: [InvoiceSeriesSeeder, TaxService, InvoicePdfService, InvoiceService],
  exports: [TaxService, InvoiceService],
})
export class InvoicingModule {}
