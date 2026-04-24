import { Injectable } from '@nestjs/common';
import type { Invoice } from '@prisma/client';
import PDFDocument from 'pdfkit';

const BRAND_COLOR = '#FF6B35';
const TEXT_MUTED = '#6b7280';
const TEXT_DARK = '#111827';
const BORDER = '#e5e7eb';

/**
 * Construye el PDF de una factura a partir del snapshot inmutable de Invoice.
 * Idempotente: el mismo Invoice siempre produce el mismo PDF (mismos datos).
 */
@Injectable()
export class InvoicePdfService {
  async render(invoice: Invoice): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Factura ${invoice.fullNumber}`,
            Author: invoice.issuerName,
            Subject: invoice.concept,
            CreationDate: invoice.issuedAt ?? invoice.issueDate,
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        this.draw(doc, invoice);
        doc.end();
      } catch (err) {
        reject(err as Error);
      }
    });
  }

  private draw(doc: PDFKit.PDFDocument, invoice: Invoice): void {
    this.drawHeader(doc, invoice);
    this.drawParties(doc, invoice);
    this.drawMeta(doc, invoice);
    this.drawLineTable(doc, invoice);
    this.drawTotals(doc, invoice);
    this.drawFooter(doc, invoice);
  }

  private drawHeader(doc: PDFKit.PDFDocument, invoice: Invoice): void {
    const top = doc.y;
    doc
      .fillColor(BRAND_COLOR)
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('FiestApp', 50, top);

    const isRectifying = invoice.type === 'RECTIFYING';
    const title = isRectifying ? 'FACTURA RECTIFICATIVA' : 'FACTURA';

    doc
      .fillColor(TEXT_DARK)
      .fontSize(18)
      .font('Helvetica-Bold')
      .text(title, 300, top, { align: 'right', width: 245 });

    doc
      .fillColor(TEXT_MUTED)
      .fontSize(10)
      .font('Helvetica')
      .text(`Nº ${invoice.fullNumber}`, 300, top + 24, { align: 'right', width: 245 });

    doc.moveDown(3);
    this.hr(doc);
  }

  private drawParties(doc: PDFKit.PDFDocument, invoice: Invoice): void {
    const startY = doc.y + 10;

    doc
      .fillColor(TEXT_MUTED)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('EMISOR', 50, startY);

    doc
      .fillColor(TEXT_DARK)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(invoice.issuerName, 50, startY + 14);

    doc
      .fillColor(TEXT_DARK)
      .fontSize(9)
      .font('Helvetica')
      .text(`NIF: ${invoice.issuerTaxId}`, 50, startY + 28)
      .text(invoice.issuerAddress, 50, startY + 42)
      .text(
        `${invoice.issuerPostalCode} ${invoice.issuerCity} (${invoice.issuerCountry})`,
        50,
        startY + 56,
      );

    doc
      .fillColor(TEXT_MUTED)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('CLIENTE', 320, startY);

    doc
      .fillColor(TEXT_DARK)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(invoice.recipientName, 320, startY + 14);

    let y = startY + 28;
    doc.fillColor(TEXT_DARK).fontSize(9).font('Helvetica');
    if (invoice.recipientTaxId) {
      doc.text(`NIF: ${invoice.recipientTaxId}`, 320, y);
      y += 14;
    }
    if (invoice.recipientAddress) {
      doc.text(invoice.recipientAddress, 320, y);
      y += 14;
    }
    const locationParts = [
      invoice.recipientPostalCode,
      invoice.recipientCity,
      invoice.recipientCountry ? `(${invoice.recipientCountry})` : null,
    ].filter(Boolean);
    if (locationParts.length > 0) {
      doc.text(locationParts.join(' '), 320, y);
      y += 14;
    }
    doc.text(invoice.recipientEmail, 320, y);

    doc.y = Math.max(doc.y, startY + 90);
    doc.moveDown(1);
    this.hr(doc);
  }

  private drawMeta(doc: PDFKit.PDFDocument, invoice: Invoice): void {
    const startY = doc.y + 10;
    const issueDate = this.formatDate(invoice.issueDate);
    const operationDate = this.formatDate(invoice.operationDate);

    const cols: Array<[string, string]> = [
      ['Fecha de expedición', issueDate],
      ['Fecha de operación', operationDate],
      ['Régimen fiscal', this.regimeLabel(invoice)],
    ];

    const colWidth = 165;
    cols.forEach(([label, value], i) => {
      const x = 50 + i * colWidth;
      doc
        .fillColor(TEXT_MUTED)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text(label.toUpperCase(), x, startY);
      doc
        .fillColor(TEXT_DARK)
        .fontSize(10)
        .font('Helvetica')
        .text(value, x, startY + 12);
    });

    if (invoice.rectifiedInvoiceId) {
      doc
        .fillColor(TEXT_MUTED)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('RECTIFICA', 50, startY + 40);
      doc
        .fillColor(TEXT_DARK)
        .fontSize(10)
        .font('Helvetica')
        .text(
          `Factura original${invoice.rectificationReason ? ` · ${invoice.rectificationReason}` : ''}`,
          50,
          startY + 52,
        );
      doc.y = startY + 72;
    } else {
      doc.y = startY + 40;
    }

    doc.moveDown(0.5);
    this.hr(doc);
  }

  private drawLineTable(doc: PDFKit.PDFDocument, invoice: Invoice): void {
    const startY = doc.y + 10;

    doc.save();
    doc.rect(50, startY, 495, 22).fill(BRAND_COLOR);
    doc
      .fillColor('#ffffff')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('CONCEPTO', 58, startY + 7, { width: 280 })
      .text('BASE', 340, startY + 7, { width: 60, align: 'right' })
      .text(`${this.taxPct(invoice)}`, 400, startY + 7, { width: 60, align: 'right' })
      .text('TOTAL', 460, startY + 7, { width: 80, align: 'right' });
    doc.restore();

    const rowY = startY + 30;
    doc.fillColor(TEXT_DARK).fontSize(10).font('Helvetica');
    doc.text(invoice.concept, 58, rowY, { width: 280 });
    if (invoice.conceptDetails) {
      doc
        .fillColor(TEXT_MUTED)
        .fontSize(9)
        .font('Helvetica')
        .text(invoice.conceptDetails, 58, rowY + 14, { width: 280 });
    }

    doc
      .fillColor(TEXT_DARK)
      .fontSize(10)
      .font('Helvetica')
      .text(this.fmtEur(invoice.netAmount), 340, rowY, { width: 60, align: 'right' })
      .text(this.fmtEur(invoice.taxAmount), 400, rowY, { width: 60, align: 'right' })
      .text(this.fmtEur(invoice.grossAmount), 460, rowY, {
        width: 80,
        align: 'right',
      });

    doc.y = rowY + (invoice.conceptDetails ? 36 : 24);
  }

  private drawTotals(doc: PDFKit.PDFDocument, invoice: Invoice): void {
    const boxY = doc.y + 10;
    const boxX = 340;
    const boxW = 205;
    const lineH = 18;

    doc.rect(boxX, boxY, boxW, lineH * 3 + 6).stroke(BORDER);

    const rows: Array<[string, string, boolean]> = [
      ['Base imponible', this.fmtEur(invoice.netAmount), false],
      [`${this.regimeLabel(invoice)}`, this.fmtEur(invoice.taxAmount), false],
      ['TOTAL', this.fmtEur(invoice.grossAmount), true],
    ];

    rows.forEach(([label, value, bold], i) => {
      const y = boxY + 4 + i * lineH;
      doc
        .fillColor(bold ? TEXT_DARK : TEXT_MUTED)
        .fontSize(bold ? 11 : 10)
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(label, boxX + 10, y, { width: boxW / 2 });
      doc
        .fillColor(bold ? BRAND_COLOR : TEXT_DARK)
        .fontSize(bold ? 11 : 10)
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(value, boxX + boxW / 2, y, {
          width: boxW / 2 - 10,
          align: 'right',
        });
    });

    doc.y = boxY + lineH * 3 + 20;
  }

  private drawFooter(doc: PDFKit.PDFDocument, invoice: Invoice): void {
    const footerY = 780;
    doc
      .fillColor(TEXT_MUTED)
      .fontSize(8)
      .font('Helvetica')
      .text(
        `Factura emitida el ${this.formatDate(invoice.issuedAt ?? invoice.issueDate)} · ${invoice.fiscalPeriod} · ${this.currencyLabel(invoice.currency)}`,
        50,
        footerY,
        { align: 'center', width: 495 },
      );
  }

  private hr(doc: PDFKit.PDFDocument): void {
    const y = doc.y;
    doc.strokeColor(BORDER).lineWidth(0.5).moveTo(50, y).lineTo(545, y).stroke();
  }

  private fmtEur(amount: number): string {
    return `${amount.toFixed(2)} €`;
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }

  private taxPct(invoice: Invoice): string {
    if (invoice.taxRate === 0) return 'Exento';
    return `${(invoice.taxRate * 100).toFixed(0)}%`;
  }

  private regimeLabel(invoice: Invoice): string {
    switch (invoice.taxRegime) {
      case 'IVA_GENERAL_21':
        return 'IVA 21%';
      case 'IVA_REDUCIDO_10':
        return 'IVA 10%';
      case 'IVA_SUPERREDUCIDO_4':
        return 'IVA 4%';
      case 'IGIC_CANARIAS_7':
        return 'IGIC 7% (Canarias)';
      case 'IPSI_CEUTA_4':
        return 'IPSI 4% (Ceuta)';
      case 'IPSI_MELILLA_4':
        return 'IPSI 4% (Melilla)';
      case 'EXENTO_UE':
        return 'Exento (UE - inversión sujeto pasivo)';
      case 'EXENTO_EXTRA_UE':
        return 'Exento (exportación)';
      default:
        return invoice.taxRegime;
    }
  }

  private currencyLabel(code: string): string {
    return code === 'EUR' ? 'Euros' : code;
  }
}
