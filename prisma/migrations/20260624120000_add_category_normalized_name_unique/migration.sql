-- Enable unaccent extension
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Step 1: Add normalizedName column
ALTER TABLE "categories" ADD COLUMN "normalizedName" TEXT;

-- Step 2: Backfill
UPDATE "categories" SET "normalizedName" = LOWER(TRIM(unaccent("name")));

-- Step 3-5: Deduplicate using DO block
DO $$
DECLARE
  dup_record RECORD;
  keeper_id TEXT;
  product_record RECORD;
BEGIN
  -- Find groups with duplicates
  FOR dup_record IN
    SELECT "storeId", "normalizedName", COUNT(*) as cnt
    FROM "categories"
    GROUP BY "storeId", "normalizedName"
    HAVING COUNT(*) > 1
  LOOP
    -- Keep the category with the most products (or the first one)
    SELECT c."id" INTO keeper_id
    FROM "categories" c
    WHERE c."storeId" = dup_record."storeId"
      AND c."normalizedName" = dup_record."normalizedName"
    ORDER BY (
      SELECT COUNT(*) FROM "products" p WHERE p."categoryId" = c."id"
    ) DESC
    LIMIT 1;

    -- Reassign products from other duplicates to the keeper
    FOR product_record IN
      SELECT p."id" as product_id
      FROM "products" p
      INNER JOIN "categories" c ON c."id" = p."categoryId"
      WHERE c."storeId" = dup_record."storeId"
        AND c."normalizedName" = dup_record."normalizedName"
        AND c."id" != keeper_id
    LOOP
      UPDATE "products" SET "categoryId" = keeper_id WHERE "id" = product_record.product_id;
    END LOOP;

    -- Delete the duplicate categories
    DELETE FROM "categories"
    WHERE "storeId" = dup_record."storeId"
      AND "normalizedName" = dup_record."normalizedName"
      AND "id" != keeper_id;
  END LOOP;
END $$;

-- Step 6: Set NOT NULL and default
ALTER TABLE "categories" ALTER COLUMN "normalizedName" SET DEFAULT '';
ALTER TABLE "categories" ALTER COLUMN "normalizedName" SET NOT NULL;

-- Step 7: Create unique index
CREATE UNIQUE INDEX "categories_storeId_normalizedName_key" ON "categories"("storeId", "normalizedName");
