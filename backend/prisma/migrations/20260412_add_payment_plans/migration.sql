-- AlterTable: Experience - deposit configuration
ALTER TABLE "experiences"
  ADD COLUMN "depositEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "depositPercentage" INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN "balanceDaysBefore" INTEGER NOT NULL DEFAULT 30;

-- CreateTable: PaymentPlan
CREATE TABLE "payment_plans" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "totalAmount" DOUBLE PRECISION NOT NULL,
  "depositAmount" DOUBLE PRECISION NOT NULL,
  "balanceAmount" DOUBLE PRECISION NOT NULL,
  "currency" "Currency" NOT NULL DEFAULT 'EUR',
  "depositPaid" BOOLEAN NOT NULL DEFAULT false,
  "depositPaidAt" TIMESTAMP(3),
  "depositStripePaymentId" TEXT,
  "balanceDueDate" TIMESTAMP(3) NOT NULL,
  "balancePaid" BOOLEAN NOT NULL DEFAULT false,
  "balancePaidAt" TIMESTAMP(3),
  "balanceStripePaymentId" TEXT,
  "balanceRetryCount" INTEGER NOT NULL DEFAULT 0,
  "balanceLastRetryAt" TIMESTAMP(3),
  "balanceFailureReason" TEXT,
  "stripeCustomerId" TEXT,
  "stripePaymentMethodId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_plans_matchId_key" ON "payment_plans"("matchId");
CREATE INDEX "payment_plans_status_idx" ON "payment_plans"("status");
CREATE INDEX "payment_plans_balanceDueDate_idx" ON "payment_plans"("balanceDueDate");

-- AddForeignKey
ALTER TABLE "payment_plans"
  ADD CONSTRAINT "payment_plans_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
