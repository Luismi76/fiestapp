-- Add toursCompleted array to users
ALTER TABLE "users" ADD COLUMN "toursCompleted" TEXT[] DEFAULT ARRAY[]::TEXT[];
