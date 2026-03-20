-- CreateTable: categories
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
CREATE INDEX "categories_group_idx" ON "categories"("group");
CREATE INDEX "categories_active_idx" ON "categories"("active");

-- Seed: insertar las 6 categorías originales del enum (para mapeo) + 7 de fiesta
INSERT INTO "categories" ("id", "name", "slug", "group", "icon", "sortOrder", "updatedAt") VALUES
  -- Fiestas populares
  (gen_random_uuid(), 'Feria', 'feria', 'fiesta', '🎪', 1, NOW()),
  (gen_random_uuid(), 'Romería', 'romeria', 'fiesta', '⛪', 2, NOW()),
  (gen_random_uuid(), 'Procesión', 'procesion', 'fiesta', '🕯️', 3, NOW()),
  (gen_random_uuid(), 'Carnaval', 'carnaval', 'fiesta', '🎭', 4, NOW()),
  (gen_random_uuid(), 'Verbena / Fiesta patronal', 'verbena', 'fiesta', '🎆', 5, NOW()),
  (gen_random_uuid(), 'Encierro / Fiesta taurina', 'encierro', 'fiesta', '🐂', 6, NOW()),
  (gen_random_uuid(), 'Festival / Concierto', 'festival', 'fiesta', '🎵', 7, NOW()),
  -- Experiencias locales
  (gen_random_uuid(), 'Gastronomía / Tapas', 'gastronomia', 'local', '🍷', 1, NOW()),
  (gen_random_uuid(), 'Cultura / Historia', 'cultura', 'local', '🏛️', 2, NOW()),
  (gen_random_uuid(), 'Naturaleza / Senderismo', 'naturaleza', 'local', '🥾', 3, NOW()),
  (gen_random_uuid(), 'Aventura', 'aventura', 'local', '⛰️', 4, NOW()),
  (gen_random_uuid(), 'Vida nocturna', 'nocturna', 'local', '🌙', 5, NOW()),
  (gen_random_uuid(), 'Familiar', 'familiar', 'local', '👨‍👩‍👧', 6, NOW());

-- AlterTable: añadir categoryId a experiences
ALTER TABLE "experiences" ADD COLUMN "categoryId" TEXT;

-- Migrate data: mapear category enum a categoryId
UPDATE "experiences" e
SET "categoryId" = c."id"
FROM "categories" c
WHERE e."category"::text = c."slug";

-- DropColumn: eliminar columna category antigua
ALTER TABLE "experiences" DROP COLUMN IF EXISTS "category";

-- DropEnum
DROP TYPE IF EXISTS "ExperienceCategory";

-- CreateIndex
CREATE INDEX "experiences_categoryId_idx" ON "experiences"("categoryId");

-- AddForeignKey
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
