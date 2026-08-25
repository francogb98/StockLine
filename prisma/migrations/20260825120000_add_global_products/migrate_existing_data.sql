-- Migration script: Create GlobalProducts for existing Products
-- Step 1: Create GlobalProducts from products with barcodes (one per barcode)
INSERT INTO global_products (id, name, brand, barcode, presentation, unit, "categoryId", "imageUrl", "cloudinaryPublicId", "normalizedKey", "createdAt", "updatedAt")
SELECT
    gen_random_uuid() as id,
    p.name,
    NULL as brand,
    p.barcode,
    NULL as presentation,
    p.unit,
    p."categoryId",
    p."imageUrl",
    p."cloudinaryPublicId",
    'barcode:' || LOWER(TRIM(p.barcode)) as "normalizedKey",
    MIN(p."createdAt") as "createdAt",
    MAX(p."updatedAt") as "updatedAt"
FROM products p
WHERE p.barcode IS NOT NULL
  AND p.barcode != ''
  AND NOT EXISTS (
    SELECT 1 FROM global_products gp WHERE gp.barcode = p.barcode
  )
GROUP BY p.name, p.barcode, p.unit, p."categoryId", p."imageUrl", p."cloudinaryPublicId";

-- Step 2: Link products with barcodes to their GlobalProducts
UPDATE products p
SET "globalProductId" = gp.id
FROM global_products gp
WHERE p."globalProductId" IS NULL
  AND p.barcode IS NOT NULL
  AND p.barcode != ''
  AND gp.barcode = p.barcode;

-- Step 3: Create GlobalProducts for products without barcodes (one per unique name)
-- Use DISTINCT ON to ensure only one GlobalProduct per normalizedKey
INSERT INTO global_products (id, name, brand, barcode, presentation, unit, "categoryId", "imageUrl", "cloudinaryPublicId", "normalizedKey", "createdAt", "updatedAt")
SELECT
    gen_random_uuid() as id,
    sub.name,
    NULL as brand,
    NULL as barcode,
    NULL as presentation,
    sub.unit,
    sub."categoryId",
    sub."imageUrl",
    sub."cloudinaryPublicId",
    sub."normalizedKey",
    sub."createdAt",
    sub."updatedAt"
FROM (
    SELECT DISTINCT ON (LOWER(TRIM(p.name)))
        p.name,
        p.unit,
        p."categoryId",
        p."imageUrl",
        p."cloudinaryPublicId",
        LOWER(TRIM(p.name)) as "normalizedKey",
        p."createdAt",
        p."updatedAt"
    FROM products p
    WHERE p."globalProductId" IS NULL
      AND (p.barcode IS NULL OR p.barcode = '')
    ORDER BY LOWER(TRIM(p.name)), p."createdAt" ASC
) sub
WHERE NOT EXISTS (
    SELECT 1 FROM global_products gp WHERE gp."normalizedKey" = sub."normalizedKey"
);

-- Step 4: Link remaining products by name
UPDATE products p
SET "globalProductId" = gp.id
FROM global_products gp
WHERE p."globalProductId" IS NULL
  AND gp."normalizedKey" = LOWER(TRIM(p.name));

-- Step 5: For any still unlinked, create individual GlobalProducts with unique keys
DO $$
DECLARE
    rec RECORD;
    new_key TEXT;
BEGIN
    FOR rec IN SELECT id, name, unit, "categoryId", "imageUrl", "cloudinaryPublicId", "createdAt", "updatedAt" FROM products WHERE "globalProductId" IS NULL
    LOOP
        new_key := LOWER(TRIM(rec.name)) || ':' || rec.id;
        INSERT INTO global_products (id, name, brand, barcode, presentation, unit, "categoryId", "imageUrl", "cloudinaryPublicId", "normalizedKey", "createdAt", "updatedAt")
        VALUES (
            gen_random_uuid(),
            rec.name,
            NULL,
            NULL,
            NULL,
            rec.unit,
            rec."categoryId",
            rec."imageUrl",
            rec."cloudinaryPublicId",
            new_key,
            rec."createdAt",
            rec."updatedAt"
        );
        UPDATE products SET "globalProductId" = (SELECT id FROM global_products WHERE "normalizedKey" = new_key) WHERE id = rec.id;
    END LOOP;
END $$;
