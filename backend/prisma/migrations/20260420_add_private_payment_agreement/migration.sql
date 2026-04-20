-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('STRIPE', 'PRIVATE_AGREEMENT');

-- AlterTable Experience: acuerdo de pago privado
ALTER TABLE "experiences"
  ADD COLUMN "allowsPrivateAgreement" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "suggestedPrice" DOUBLE PRECISION;

-- AlterTable Match: método de pago y confirmaciones del acuerdo privado
ALTER TABLE "matches"
  ADD COLUMN "paymentMethod" "PaymentMethod",
  ADD COLUMN "agreedPaymentChannel" TEXT,
  ADD COLUMN "travelerDeclaredPaid" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "travelerDeclaredPaidAt" TIMESTAMP(3),
  ADD COLUMN "hostConfirmedReceived" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hostConfirmedReceivedAt" TIMESTAMP(3);
