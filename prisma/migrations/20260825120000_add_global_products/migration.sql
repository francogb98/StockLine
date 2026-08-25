-- CreateTable
CREATE TABLE IF NOT EXISTS "global_products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "barcode" TEXT,
    "presentation" TEXT,
    "unit" TEXT,
    "categoryId" TEXT,
    "imageUrl" TEXT,
    "cloudinaryPublicId" TEXT,
    "normalizedKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'global_products_barcode_key') THEN
        CREATE UNIQUE INDEX "global_products_barcode_key" ON "global_products"("barcode");
    END IF;
END $$;

-- CreateIndex
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'global_products_normalizedKey_key') THEN
        CREATE UNIQUE INDEX "global_products_normalizedKey_key" ON "global_products"("normalizedKey");
    END IF;
END $$;

-- CreateIndex
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'global_products_barcode_idx') THEN
        CREATE INDEX "global_products_barcode_idx" ON "global_products"("barcode");
    END IF;
END $$;

-- CreateIndex
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'global_products_normalizedKey_idx') THEN
        CREATE INDEX "global_products_normalizedKey_idx" ON "global_products"("normalizedKey");
    END IF;
END $$;

-- AlterTable: Add globalProductId to products
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'globalProductId') THEN
        ALTER TABLE "products" ADD COLUMN "globalProductId" TEXT;
    END IF;
END $$;

-- DropIndex: Remove unique constraint from barcode (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'products_barcode_key') THEN
        DROP INDEX "products_barcode_key";
    END IF;
END $$;

-- CreateIndex: Add index for globalProductId
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'products_globalProductId_idx') THEN
        CREATE INDEX "products_globalProductId_idx" ON "products"("globalProductId");
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'global_products_categoryId_fkey') THEN
        ALTER TABLE "global_products" ADD CONSTRAINT "global_products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_globalProductId_fkey') THEN
        ALTER TABLE "products" ADD CONSTRAINT "products_globalProductId_fkey" FOREIGN KEY ("globalProductId") REFERENCES "global_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
