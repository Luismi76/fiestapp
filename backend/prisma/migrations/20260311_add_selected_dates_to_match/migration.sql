-- AlterTable
ALTER TABLE "matches" ADD COLUMN "selectedDates" TIMESTAMP(3)[] DEFAULT ARRAY[]::TIMESTAMP(3)[];
