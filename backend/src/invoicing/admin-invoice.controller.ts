import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { InvoiceStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { InvoiceService } from './invoice.service';

const INVOICE_STATUSES: InvoiceStatus[] = ['DRAFT', 'ISSUED', 'VOIDED'];

@Controller('admin/invoices')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminInvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  async list(
    @Query('series') series?: string,
    @Query('year') year?: string,
    @Query('quarter') quarter?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const normalizedStatus =
      status && INVOICE_STATUSES.includes(status as InvoiceStatus)
        ? (status as InvoiceStatus)
        : undefined;

    return this.invoiceService.listForAdmin({
      series: series || undefined,
      year: year ? parseInt(year, 10) : undefined,
      quarter: quarter ? parseInt(quarter, 10) : undefined,
      status: normalizedStatus,
      search: search || undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('book/export')
  async exportBook(
    @Res() res: Response,
    @Query('year') year?: string,
    @Query('quarter') quarter?: string,
  ) {
    if (!year) {
      throw new BadRequestException('year es obligatorio');
    }
    const parsedYear = parseInt(year, 10);
    if (isNaN(parsedYear) || parsedYear < 2020 || parsedYear > 2100) {
      throw new BadRequestException('year fuera de rango');
    }
    const parsedQuarter = quarter ? parseInt(quarter, 10) : undefined;
    if (parsedQuarter !== undefined && (isNaN(parsedQuarter) || parsedQuarter < 1 || parsedQuarter > 4)) {
      throw new BadRequestException('quarter debe estar entre 1 y 4');
    }
    const { buffer, filename } = await this.invoiceService.buildInvoiceBookXlsx({
      year: parsedYear,
      quarter: parsedQuarter,
    });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.invoiceService.getByIdForAdmin(id);
  }

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const { buffer, filename } = await this.invoiceService.renderPdfForAdmin(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.send(buffer);
  }

  @Post(':id/resend')
  @HttpCode(HttpStatus.OK)
  async resendEmail(@Param('id') id: string) {
    const invoice = await this.invoiceService.resendEmail(id);
    return {
      ok: true,
      emailedTo: invoice.emailedTo,
      emailedAt: invoice.emailedAt,
    };
  }

  @Post(':id/rectify')
  @HttpCode(HttpStatus.CREATED)
  async rectify(
    @Param('id') id: string,
    @Body() body: { amount?: number; reason?: string },
  ) {
    if (typeof body.amount !== 'number' || !isFinite(body.amount) || body.amount <= 0) {
      throw new BadRequestException('amount debe ser un número positivo');
    }
    if (!body.reason || typeof body.reason !== 'string' || body.reason.trim().length < 3) {
      throw new BadRequestException('reason es obligatorio (mínimo 3 caracteres)');
    }
    return this.invoiceService.rectifyManually({
      originalInvoiceId: id,
      amount: body.amount,
      reason: body.reason.trim(),
    });
  }
}
