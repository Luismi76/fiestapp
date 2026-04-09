-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'pack_purchase';

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "creditsAmount" INTEGER,
ADD COLUMN     "packId" TEXT;

-- AlterTable
ALTER TABLE "wallets" ADD COLUMN     "credits" INTEGER NOT NULL DEFAULT 0;
