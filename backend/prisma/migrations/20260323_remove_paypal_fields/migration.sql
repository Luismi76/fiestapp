-- DropIndex
DROP INDEX IF EXISTS "transactions_paypalId_key";
DROP INDEX IF EXISTS "transactions_paypalOrderId_key";

-- AlterTable: remove PayPal fields from transactions
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "paypalId";
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "paypalOrderId";
