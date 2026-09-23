-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('SIMPLE', 'PRO');

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN "tier" "SubscriptionTier" NOT NULL DEFAULT 'SIMPLE';

-- Backfill: assign PRO to existing stores with more than 200 products
UPDATE "subscriptions" s
SET "tier" = 'PRO'
WHERE EXISTS (
  SELECT 1 FROM "products" p
  WHERE p."storeId" = s."storeId"
  GROUP BY p."storeId"
  HAVING COUNT(*) > 200
);
