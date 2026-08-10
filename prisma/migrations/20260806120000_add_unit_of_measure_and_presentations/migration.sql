-- ============================================================================
-- Unit of measure + product presentations
-- Compatible migration: existing data is preserved.
-- Existing products become DISCRETA with unit "unit" and no presentations.
-- All quantity/price fields migrate to Decimal without data loss.
-- ============================================================================

-- ---- Enum: QuantityType ----------------------------------------------------
CREATE TYPE "QuantityType" AS ENUM ('DISCRETA', 'CONTINUA');

-- ---- Products: alter columns to Decimal and add new columns ---------------
ALTER TABLE "products"
  ALTER COLUMN "stock"        TYPE DECIMAL(12, 3) USING "stock"::DECIMAL(12, 3),
  ALTER COLUMN "minStock"     TYPE DECIMAL(12, 3) USING "minStock"::DECIMAL(12, 3),
  ALTER COLUMN "price"        TYPE DECIMAL(12, 2) USING "price"::DECIMAL(12, 2),
  ALTER COLUMN "cost"         TYPE DECIMAL(12, 2) USING "cost"::DECIMAL(12, 2);

ALTER TABLE "products"
  ADD COLUMN "quantityType" "QuantityType" NOT NULL DEFAULT 'DISCRETA',
  ADD COLUMN "unit"         TEXT           NOT NULL DEFAULT 'unit';

-- ---- Product presentations ------------------------------------------------
CREATE TABLE "product_presentations" (
    "id"         TEXT NOT NULL,
    "productId"  TEXT NOT NULL,
    "name"       TEXT NOT NULL,
    "quantity"   DECIMAL(12, 3) NOT NULL,
    "unit"       TEXT NOT NULL,
    "active"     BOOLEAN NOT NULL DEFAULT true,
    "sortOrder"  INTEGER NOT NULL DEFAULT 0,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_presentations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_presentations_productId_active_idx"
  ON "product_presentations"("productId", "active");

ALTER TABLE "product_presentations"
  ADD CONSTRAINT "product_presentations_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ---- Sale items: quantity -> Decimal, presentation columns ----------------
ALTER TABLE "sale_items"
  ALTER COLUMN "quantity" TYPE DECIMAL(12, 3) USING "quantity"::DECIMAL(12, 3);

ALTER TABLE "sale_items"
  ADD COLUMN "presentationId"   TEXT,
  ADD COLUMN "presentationName" TEXT,
  ADD COLUMN "baseQuantity"     DECIMAL(12, 3);

-- Backfill baseQuantity with quantity for existing rows.
UPDATE "sale_items"
  SET "baseQuantity" = "quantity"
  WHERE "baseQuantity" IS NULL;

ALTER TABLE "sale_items"
  ALTER COLUMN "baseQuantity" SET NOT NULL,
  ALTER COLUMN "baseQuantity" SET DEFAULT 0;

ALTER TABLE "sale_items"
  ADD CONSTRAINT "sale_items_presentationId_fkey"
  FOREIGN KEY ("presentationId") REFERENCES "product_presentations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "sale_items_presentationId_idx"
  ON "sale_items"("presentationId");

-- ---- Stock movements: quantities -> Decimal ------------------------------
ALTER TABLE "stock_movements"
  ALTER COLUMN "quantity"      TYPE DECIMAL(12, 3) USING "quantity"::DECIMAL(12, 3),
  ALTER COLUMN "previousStock" TYPE DECIMAL(12, 3) USING "previousStock"::DECIMAL(12, 3),
  ALTER COLUMN "newStock"      TYPE DECIMAL(12, 3) USING "newStock"::DECIMAL(12, 3);

-- ---- Suspended sales: quantities -> Decimal (snapshot persistence) --------
ALTER TABLE "suspended_sale_items"
  ALTER COLUMN "quantity" TYPE DECIMAL(12, 3) USING "quantity"::DECIMAL(12, 3);
