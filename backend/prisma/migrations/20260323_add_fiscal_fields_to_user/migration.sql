-- AlterTable: add fiscal fields to users for DAC7/AEAT compliance
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "taxId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "taxIdVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bankAccount" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "fiscalAddress" TEXT;
