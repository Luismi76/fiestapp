import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InvoiceSeriesSeeder } from './invoice-series.seeder';
import { TaxService } from './tax.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { AdminInvoiceController } from './admin-invoice.controller';
import { FiscalClosureService } from './fiscal-closure.service';
import { AdminFiscalClosureController } from './admin-fiscal-closure.controller';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [
    InvoiceController,
    AdminInvoiceController,
    AdminFiscalClosureController,
  ],
  providers: [
    InvoiceSeriesSeeder,
    TaxService,
    InvoicePdfService,
    InvoiceService,
    FiscalClosureService,
  ],
  exports: [TaxService, InvoiceService, FiscalClosureService],
})
export class InvoicingModule {}
