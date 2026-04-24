import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Invoice, InvoiceStatus, InvoiceType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { EmailService } from '../email/email.service';
import { TaxService } from './tax.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { FiscalClosureService } from './fiscal-closure.service';

const SIMPLIFIED_THRESHOLD_EUR = 3000;

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly platformConfig: PlatformConfigService,
    private readonly taxService: TaxService,
    private readonly pdfService: InvoicePdfService,
    private readonly emailService: EmailService,
    private readonly fiscalClosure: FiscalClosureService,
  ) {}

  /**
   * Emite la factura asociada a una compra de pack (`pack_purchase`).
   * Idempotente: múltiples llamadas con el mismo transactionId devuelven la
   * misma factura una vez emitida. No lanza si falla el envío del email;
   * sí lanza si falla la creación del registro.
   */
  async issueForPackPurchase(transactionId: string): Promise<Invoice> {
    const existing = await this.prisma.invoice.findUnique({
      where: { transactionId },
    });
    if (existing && existing.status === InvoiceStatus.ISSUED) {
      return existing;
    }

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { user: true },
    });
    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} no encontrada`);
    }
    if (transaction.type !== 'pack_purchase') {
      throw new Error(
        `issueForPackPurchase sólo admite transacciones de tipo pack_purchase (tipo recibido: ${transaction.type})`,
      );
    }
    if (transaction.status !== 'completed') {
      throw new Error(
        `La transacción ${transactionId} debe estar 'completed' para emitir factura (estado actual: ${transaction.status})`,
      );
    }
    if (!transaction.user) {
      throw new Error(
        `La transacción ${transactionId} no tiene usuario asociado`,
      );
    }

    const user = transaction.user;
    const regime = this.taxService.resolveRegime({
      country: user.residenceCountry,
      region: user.residenceRegion,
    });
    const amounts = this.taxService.computeAmounts(
      transaction.amount,
      regime.rate,
    );

    const issuer = this.platformConfig.getIssuerData();
    const now = new Date();
    const operationDate = transaction.createdAt;
    const fiscalPeriod = this.taxService.fiscalPeriodOf(operationDate).label;

    // No permitir emitir facturas con operationDate en periodos cerrados
    await this.fiscalClosure.assertPeriodOpen(fiscalPeriod);

    // Determinar tipo de factura
    const invoiceType: InvoiceType =
      (user.taxId && user.fiscalAddress) || transaction.amount > SIMPLIFIED_THRESHOLD_EUR
        ? InvoiceType.COMPLETE
        : InvoiceType.SIMPLIFIED;

    // Concepto (descripción legible para la factura)
    const concept = transaction.description || 'Pack de experiencias FiestApp';
    const conceptDetails = transaction.creditsAmount
      ? `${transaction.creditsAmount} créditos de experiencia`
      : null;

    // Reserva atómica de número dentro de una transacción SQL
    const invoice = await this.prisma.$transaction(async (tx) => {
      // Si por race condition alguien creó la Invoice entre el findUnique inicial
      // y esta transacción, reutilizarla.
      const race = await tx.invoice.findUnique({ where: { transactionId } });
      if (race) return race;

      const year = operationDate.getUTCFullYear();
      const series = await tx.invoiceSeries.findUnique({
        where: { code_year: { code: 'A', year } },
      });
      if (!series) {
        throw new Error(
          `No existe la serie A para el año ${year}. El seeder debería haberla creado.`,
        );
      }
      if (!series.active) {
        throw new Error(`La serie A-${year} está desactivada`);
      }

      // Reserva atómica: incrementa y devuelve el valor previo.
      const updatedSeries = await tx.invoiceSeries.update({
        where: { code_year: { code: 'A', year } },
        data: { nextNumber: { increment: 1 } },
      });
      const number = updatedSeries.nextNumber - 1;
      const fullNumber = `A-${year}-${String(number).padStart(5, '0')}`;

      return tx.invoice.create({
        data: {
          series: 'A',
          year,
          number,
          fullNumber,
          type: invoiceType,
          status: InvoiceStatus.ISSUED,
          issuerName: issuer.name,
          issuerTaxId: issuer.taxId,
          issuerAddress: issuer.address,
          issuerPostalCode: issuer.postalCode,
          issuerCity: issuer.city,
          issuerCountry: issuer.country,
          recipientUserId: user.id,
          recipientName: user.name,
          recipientTaxId: user.taxId || null,
          recipientAddress: user.fiscalAddress || null,
          recipientPostalCode: user.fiscalPostalCode || null,
          recipientCity: user.city || null,
          recipientCountry: user.residenceCountry || null,
          recipientEmail: user.email,
          issueDate: now,
          operationDate,
          taxRegime: regime.regime,
          taxRate: regime.rate,
          netAmount: amounts.net,
          taxAmount: amounts.tax,
          grossAmount: amounts.gross,
          currency: 'EUR',
          concept,
          conceptDetails,
          transactionId: transaction.id,
          fiscalPeriod,
          issuedAt: now,
        },
      });
    });

    this.logger.log(
      `Factura emitida ${invoice.fullNumber} (${amounts.gross}€, ${regime.label}) para user=${user.id} transaction=${transactionId}`,
    );

    // Envío de email (no bloqueante: loguear si falla, no relanzar)
    try {
      await this.sendInvoiceEmail(invoice);
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { emailedAt: new Date(), emailedTo: invoice.recipientEmail },
      });
    } catch (err) {
      this.logger.warn(
        `No se pudo enviar el email de la factura ${invoice.fullNumber}: ${err instanceof Error ? err.message : err}`,
      );
    }

    return invoice;
  }

  /**
   * Emite una factura rectificativa (serie RA) sobre una factura original
   * en respuesta a un reembolso. Idempotente por refundTransactionId (la
   * relación Invoice.transactionId es @unique, así que una segunda llamada
   * con la misma refundTransactionId devuelve la rectificativa existente).
   *
   * La rectificativa conserva el snapshot de emisor/receptor de la original
   * (obligación legal: los datos del receptor deben coincidir).
   */
  async issueRectifyingInvoice(params: {
    originalInvoiceId: string;
    refundTransactionId: string;
    refundAmount: number; // importe bruto a rectificar
    reason?: string;
  }): Promise<Invoice> {
    const existing = await this.prisma.invoice.findUnique({
      where: { transactionId: params.refundTransactionId },
    });
    if (existing && existing.status === InvoiceStatus.ISSUED) {
      return existing;
    }

    const original = await this.prisma.invoice.findUnique({
      where: { id: params.originalInvoiceId },
    });
    if (!original) {
      throw new NotFoundException(
        `Factura original ${params.originalInvoiceId} no encontrada`,
      );
    }

    const refundTx = await this.prisma.transaction.findUnique({
      where: { id: params.refundTransactionId },
    });
    if (!refundTx) {
      throw new NotFoundException(
        `Transaction de refund ${params.refundTransactionId} no encontrada`,
      );
    }

    const refundAmount = Math.round(params.refundAmount * 100) / 100;
    if (refundAmount <= 0) {
      throw new Error('refundAmount debe ser > 0');
    }

    // Reparto proporcional de base/cuota según el régimen de la factura original
    const ratio = refundAmount / original.grossAmount;
    const netAmount = Math.round(original.netAmount * ratio * 100) / 100;
    const taxAmount = Math.round((refundAmount - netAmount) * 100) / 100;

    const now = new Date();
    const operationDate = refundTx.createdAt;
    const fiscalPeriod = this.taxService.fiscalPeriodOf(operationDate).label;

    // La rectificativa se emite con fecha actual; su periodo debe estar abierto
    await this.fiscalClosure.assertPeriodOpen(fiscalPeriod);

    const invoice = await this.prisma.$transaction(async (tx) => {
      const race = await tx.invoice.findUnique({
        where: { transactionId: params.refundTransactionId },
      });
      if (race) return race;

      const year = operationDate.getUTCFullYear();
      const series = await tx.invoiceSeries.findUnique({
        where: { code_year: { code: 'RA', year } },
      });
      if (!series) {
        throw new Error(
          `No existe la serie RA para el año ${year}. El seeder debería haberla creado.`,
        );
      }
      if (!series.active) {
        throw new Error(`La serie RA-${year} está desactivada`);
      }

      const updatedSeries = await tx.invoiceSeries.update({
        where: { code_year: { code: 'RA', year } },
        data: { nextNumber: { increment: 1 } },
      });
      const number = updatedSeries.nextNumber - 1;
      const fullNumber = `RA-${year}-${String(number).padStart(5, '0')}`;

      return tx.invoice.create({
        data: {
          series: 'RA',
          year,
          number,
          fullNumber,
          type: InvoiceType.RECTIFYING,
          status: InvoiceStatus.ISSUED,
          // Snapshot emisor/receptor iguales al original (inmutable)
          issuerName: original.issuerName,
          issuerTaxId: original.issuerTaxId,
          issuerAddress: original.issuerAddress,
          issuerPostalCode: original.issuerPostalCode,
          issuerCity: original.issuerCity,
          issuerCountry: original.issuerCountry,
          recipientUserId: original.recipientUserId,
          recipientName: original.recipientName,
          recipientTaxId: original.recipientTaxId,
          recipientAddress: original.recipientAddress,
          recipientPostalCode: original.recipientPostalCode,
          recipientCity: original.recipientCity,
          recipientCountry: original.recipientCountry,
          recipientEmail: original.recipientEmail,
          issueDate: now,
          operationDate,
          taxRegime: original.taxRegime,
          taxRate: original.taxRate,
          netAmount,
          taxAmount,
          grossAmount: refundAmount,
          currency: original.currency,
          concept: `Rectificación de factura ${original.fullNumber} — reembolso`,
          conceptDetails: original.concept,
          transactionId: params.refundTransactionId,
          rectifiedInvoiceId: original.id,
          rectificationReason: params.reason || 'Reembolso',
          fiscalPeriod,
          issuedAt: now,
        },
      });
    });

    this.logger.log(
      `Rectificativa emitida ${invoice.fullNumber} sobre ${original.fullNumber} (${refundAmount}€)`,
    );

    try {
      await this.sendInvoiceEmail(invoice);
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { emailedAt: new Date(), emailedTo: invoice.recipientEmail },
      });
    } catch (err) {
      this.logger.warn(
        `No se pudo enviar el email de la rectificativa ${invoice.fullNumber}: ${err instanceof Error ? err.message : err}`,
      );
    }

    return invoice;
  }

  async getMyInvoices(
    userId: string,
    options: { page?: number; limit?: number } = {},
  ) {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));

    const where: Prisma.InvoiceWhereInput = {
      recipientUserId: userId,
      status: InvoiceStatus.ISSUED,
    };

    const [total, invoices] = await this.prisma.$transaction([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        orderBy: { issueDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          fullNumber: true,
          type: true,
          issueDate: true,
          operationDate: true,
          concept: true,
          netAmount: true,
          taxAmount: true,
          grossAmount: true,
          taxRegime: true,
          taxRate: true,
          currency: true,
        },
      }),
    ]);

    return {
      invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getByIdForUser(invoiceId: string, userId: string): Promise<Invoice> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) {
      throw new NotFoundException('Factura no encontrada');
    }
    if (invoice.recipientUserId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta factura');
    }
    return invoice;
  }

  // ==========================================================
  // Admin
  // ==========================================================

  async listForAdmin(filters: {
    series?: string;
    year?: number;
    quarter?: number;
    status?: InvoiceStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(200, Math.max(1, filters.limit ?? 25));

    const where: Prisma.InvoiceWhereInput = {};
    if (filters.series) where.series = filters.series;
    if (filters.status) where.status = filters.status;

    if (filters.year && filters.quarter && filters.quarter >= 1 && filters.quarter <= 4) {
      where.fiscalPeriod = `${filters.year}-Q${filters.quarter}`;
    } else if (filters.year) {
      where.year = filters.year;
    }

    if (filters.search && filters.search.trim()) {
      const s = filters.search.trim();
      where.OR = [
        { fullNumber: { contains: s, mode: 'insensitive' } },
        { recipientName: { contains: s, mode: 'insensitive' } },
        { recipientEmail: { contains: s, mode: 'insensitive' } },
        { recipientTaxId: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, invoices] = await this.prisma.$transaction([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        orderBy: [{ year: 'desc' }, { number: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getByIdForAdmin(invoiceId: string): Promise<Invoice> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) throw new NotFoundException('Factura no encontrada');
    return invoice;
  }

  async renderPdfForAdmin(invoiceId: string): Promise<{ buffer: Buffer; filename: string; invoice: Invoice }> {
    const invoice = await this.getByIdForAdmin(invoiceId);
    const buffer = await this.pdfService.render(invoice);
    return {
      buffer,
      filename: `factura-${invoice.fullNumber}.pdf`,
      invoice,
    };
  }

  /**
   * Reenvía el email de la factura al receptor. Si el email original falló
   * o el usuario pidió reenvío, esta es la entrada. Registra el nuevo envío.
   */
  async resendEmail(invoiceId: string): Promise<Invoice> {
    const invoice = await this.getByIdForAdmin(invoiceId);
    await this.sendInvoiceEmail(invoice);
    return this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { emailedAt: new Date(), emailedTo: invoice.recipientEmail },
    });
  }

  /**
   * Rectifica una factura manualmente desde el panel admin, sin pasar por
   * Stripe. Crea una Transaction de refund "manual" (stripeId null) y emite
   * la rectificativa asociada. Útil para correcciones contables que no
   * implican devolución real de dinero (ej. rectificación de base imponible
   * por error de captura).
   */
  async rectifyManually(params: {
    originalInvoiceId: string;
    amount: number;
    reason: string;
  }): Promise<Invoice> {
    const original = await this.prisma.invoice.findUnique({
      where: { id: params.originalInvoiceId },
    });
    if (!original) {
      throw new NotFoundException('Factura original no encontrada');
    }
    if (!original.recipientUserId) {
      throw new Error(
        'No se puede rectificar manualmente una factura sin usuario asociado',
      );
    }
    const amount = Math.round(params.amount * 100) / 100;
    if (amount <= 0 || amount > original.grossAmount) {
      throw new Error(
        `El importe de rectificación debe estar entre 0 y ${original.grossAmount}€`,
      );
    }

    const refundTx = await this.prisma.transaction.create({
      data: {
        userId: original.recipientUserId,
        type: 'refund',
        amount,
        status: 'completed',
        description: `Rectificación manual de ${original.fullNumber}: ${params.reason}`,
      },
    });

    return this.issueRectifyingInvoice({
      originalInvoiceId: original.id,
      refundTransactionId: refundTx.id,
      refundAmount: amount,
      reason: params.reason,
    });
  }

  async renderPdfForUser(invoiceId: string, userId: string): Promise<{ buffer: Buffer; filename: string; invoice: Invoice }> {
    const invoice = await this.getByIdForUser(invoiceId, userId);
    const buffer = await this.pdfService.render(invoice);

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadAt: new Date(),
      },
    });

    return {
      buffer,
      filename: `factura-${invoice.fullNumber}.pdf`,
      invoice,
    };
  }

  private async sendInvoiceEmail(invoice: Invoice): Promise<void> {
    const pdf = await this.pdfService.render(invoice);
    const html = this.buildEmailHtml(invoice);
    await this.emailService.sendInvoiceEmail(
      invoice.recipientEmail,
      `Factura ${invoice.fullNumber} — FiestApp`,
      html,
      pdf,
      `factura-${invoice.fullNumber}.pdf`,
    );
  }

  private buildEmailHtml(invoice: Invoice): string {
    const total = `${invoice.grossAmount.toFixed(2)} €`;
    return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f5f5f5;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:40px 0;">
      <table role="presentation" style="width:100%;max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#FF6B35 0%,#FFA500 100%);padding:32px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:24px;">FiestApp</h1>
          </td>
        </tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 16px;color:#111827;">Hola ${invoice.recipientName},</h2>
          <p style="margin:0 0 16px;color:#374151;">Te adjuntamos la factura de tu compra en FiestApp.</p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:16px 0;">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#6b7280;">Número:</span><strong>${invoice.fullNumber}</strong></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#6b7280;">Concepto:</span><strong>${invoice.concept}</strong></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:#6b7280;">Total:</span><strong style="color:#FF6B35;">${total}</strong></div>
          </div>
          <p style="margin:0;color:#6b7280;font-size:13px;">También puedes consultar y descargar todas tus facturas desde <a href="https://fiestapp.lmsc.es/profile/invoices" style="color:#FF6B35;">Mis facturas</a> en tu perfil.</p>
        </td></tr>
        <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:12px;">
          Factura emitida por ${invoice.issuerName} · ${invoice.issuerTaxId}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
  }
}
