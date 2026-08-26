-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'MERGED');

-- AlterEnum
ALTER TYPE "MovementType" ADD VALUE 'MERGE_IN';
ALTER TYPE "MovementType" ADD VALUE 'MERGE_OUT';

-- AlterTable
ALTER TABLE "products" ADD COLUMN "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "mergedIntoId" TEXT,
ADD COLUMN "mergedAt" TIMESTAMP(3),
ADD COLUMN "mergedByUserId" TEXT;

-- CreateIndex
CREATE INDEX "products_storeId_status_idx" ON "products"("storeId", "status");

-- CreateIndex
CREATE INDEX "products_mergedIntoId_idx" ON "products"("mergedIntoId");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
