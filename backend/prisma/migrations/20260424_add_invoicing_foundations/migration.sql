-- CreateEnum: InvoiceType
CREATE TYPE "InvoiceType" AS ENUM ('COMPLETE', 'SIMPLIFIED', 'RECTIFYING');

-- CreateEnum: InvoiceStatus
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'VOIDED');

-- CreateEnum: TaxRegime
CREATE TYPE "TaxRegime" AS ENUM (
  'IVA_GENERAL_21',
  'IVA_REDUCIDO_10',
  'IVA_SUPERREDUCIDO_4',
  'IGIC_CANARIAS_7',
  'IPSI_CEUTA_4',
  'IPSI_MELILLA_4',
  'EXENTO_UE',
  'EXENTO_EXTRA_UE'
);

-- AlterTable: User - fiscal fields for invoicing and DAC7
ALTER TABLE "users"
  ADD COLUMN "fiscalPostalCode" TEXT,
  ADD COLUMN "residenceCountry" TEXT,
  ADD COLUMN "residenceRegion" TEXT,
  ADD COLUMN "birthDate" TIMESTAMP(3);

-- CreateTable: Invoice
CREATE TABLE "invoices" (
  "id" TEXT NOT NULL,
  "series" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "number" INTEGER NOT NULL,
  "fullNumber" TEXT NOT NULL,
  "type" "InvoiceType" NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "issuerName" TEXT NOT NULL,
  "issuerTaxId" TEXT NOT NULL,
  "issuerAddress" TEXT NOT NULL,
  "issuerPostalCode" TEXT NOT NULL,
  "issuerCity" TEXT NOT NULL,
  "issuerCountry" TEXT NOT NULL DEFAULT 'ES',
  "recipientUserId" TEXT,
  "recipientName" TEXT NOT NULL,
  "recipientTaxId" TEXT,
  "recipientAddress" TEXT,
  "recipientPostalCode" TEXT,
  "recipientCity" TEXT,
  "recipientCountry" TEXT,
  "recipientEmail" TEXT NOT NULL,
  "issueDate" TIMESTAMP(3) NOT NULL,
  "operationDate" TIMESTAMP(3) NOT NULL,
  "taxRegime" "TaxRegime" NOT NULL,
  "taxRate" DOUBLE PRECISION NOT NULL,
  "netAmount" DOUBLE PRECISION NOT NULL,
  "taxAmount" DOUBLE PRECISION NOT NULL,
  "grossAmount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "concept" TEXT NOT NULL,
  "conceptDetails" TEXT,
  "transactionId" TEXT,
  "rectifiedInvoiceId" TEXT,
  "rectificationReason" TEXT,
  "emailedAt" TIMESTAMP(3),
  "emailedTo" TEXT,
  "downloadCount" INTEGER NOT NULL DEFAULT 0,
  "lastDownloadAt" TIMESTAMP(3),
  "issuedAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "voidReason" TEXT,
  "fiscalPeriod" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Invoice
CREATE UNIQUE INDEX "invoices_fullNumber_key" ON "invoices"("fullNumber");
CREATE UNIQUE INDEX "invoices_transactionId_key" ON "invoices"("transactionId");
CREATE UNIQUE INDEX "invoices_series_year_number_key" ON "invoices"("series", "year", "number");
CREATE INDEX "invoices_recipientUserId_idx" ON "invoices"("recipientUserId");
CREATE INDEX "invoices_issueDate_idx" ON "invoices"("issueDate");
CREATE INDEX "invoices_fiscalPeriod_idx" ON "invoices"("fiscalPeriod");
CREATE INDEX "invoices_status_idx" ON "invoices"("status");
CREATE INDEX "invoices_series_year_idx" ON "invoices"("series", "year");

-- CreateTable: InvoiceSeries
CREATE TABLE "invoice_series" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "nextNumber" INTEGER NOT NULL DEFAULT 1,
  "description" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "invoice_series_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: InvoiceSeries
CREATE UNIQUE INDEX "invoice_series_code_year_key" ON "invoice_series"("code", "year");

-- CreateTable: FiscalPeriodClosure
CREATE TABLE "fiscal_period_closures" (
  "id" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "quarter" INTEGER NOT NULL,
  "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedByUserId" TEXT NOT NULL,
  "notes" TEXT,
  "modelo303Submitted" BOOLEAN NOT NULL DEFAULT false,
  "modelo303SubmittedAt" TIMESTAMP(3),

  CONSTRAINT "fiscal_period_closures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: FiscalPeriodClosure
CREATE UNIQUE INDEX "fiscal_period_closures_period_key" ON "fiscal_period_closures"("period");
CREATE INDEX "fiscal_period_closures_year_quarter_idx" ON "fiscal_period_closures"("year", "quarter");

-- AddForeignKey: Invoice -> User (recipient)
ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_recipientUserId_fkey"
  FOREIGN KEY ("recipientUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Invoice -> Transaction
ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_transactionId_fkey"
  FOREIGN KEY ("transactionId") REFERENCES "transactions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Invoice -> Invoice (rectifying)
ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_rectifiedInvoiceId_fkey"
  FOREIGN KEY ("rectifiedInvoiceId") REFERENCES "invoices"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: FiscalPeriodClosure -> User (closedBy)
ALTER TABLE "fiscal_period_closures"
  ADD CONSTRAINT "fiscal_period_closures_closedByUserId_fkey"
  FOREIGN KEY ("closedByUserId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
