-- AlterTable
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "offerDescription" TEXT;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "offerExperienceId" TEXT;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'matches_offerExperienceId_fkey'
  ) THEN
    ALTER TABLE "matches" ADD CONSTRAINT "matches_offerExperienceId_fkey" FOREIGN KEY ("offerExperienceId") REFERENCES "experiences"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
