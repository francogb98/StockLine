/*
  Warnings:

  - You are about to alter the column `openingAmount` on the `cash_sessions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `expectedAmount` on the `cash_sessions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `closingAmount` on the `cash_sessions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `difference` on the `cash_sessions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `quantity` on the `ingredient_stock_movements` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `previousStock` on the `ingredient_stock_movements` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `newStock` on the `ingredient_stock_movements` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `costPerUnit` on the `ingredient_stock_movements` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `cost` on the `ingredients` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `stock` on the `ingredients` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `minStock` on the `ingredients` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `quantityUsed` on the `production_usages` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `costAtTime` on the `production_usages` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `quantity` on the `productions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `quantity` on the `recipe_ingredients` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `yield` on the `recipes` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `cost` on the `recipes` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `unitPrice` on the `sale_items` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `total` on the `sale_items` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to drop the column `customerId` on the `sales` table. All the data in the column will be lost.
  - You are about to alter the column `subtotal` on the `sales` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `tax` on the `sales` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `total` on the `sales` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to drop the column `businessTypeId` on the `stores` table. All the data in the column will be lost.
  - You are about to alter the column `unitPrice` on the `suspended_sale_items` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `total` on the `suspended_sale_items` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `total` on the `suspended_sales` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to drop the `business_type_module_defaults` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `business_types` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `customers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `module_permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `modules` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `store_modules` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "business_type_module_defaults" DROP CONSTRAINT "business_type_module_defaults_businessTypeId_fkey";

-- DropForeignKey
ALTER TABLE "customers" DROP CONSTRAINT "customers_storeId_fkey";

-- DropForeignKey
ALTER TABLE "module_permissions" DROP CONSTRAINT "module_permissions_moduleId_fkey";

-- DropForeignKey
ALTER TABLE "sales" DROP CONSTRAINT "sales_customerId_fkey";

-- DropForeignKey
ALTER TABLE "store_modules" DROP CONSTRAINT "store_modules_moduleId_fkey";

-- DropForeignKey
ALTER TABLE "store_modules" DROP CONSTRAINT "store_modules_storeId_fkey";

-- DropForeignKey
ALTER TABLE "stores" DROP CONSTRAINT "stores_businessTypeId_fkey";

-- AlterTable
ALTER TABLE "cash_sessions" ALTER COLUMN "openingAmount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "expectedAmount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "closingAmount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "difference" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "ingredient_stock_movements" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "previousStock" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "newStock" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "costPerUnit" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "ingredients" ALTER COLUMN "cost" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "stock" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "minStock" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "production_usages" ALTER COLUMN "quantityUsed" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "costAtTime" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "productions" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "recipe_ingredients" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "recipes" ALTER COLUMN "yield" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "cost" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "sale_items" ALTER COLUMN "unitPrice" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "total" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "sales" DROP COLUMN "customerId",
ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "tax" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "total" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "stores" DROP COLUMN "businessTypeId",
ADD COLUMN     "internal_notes" TEXT,
ADD COLUMN     "suspended_at" TIMESTAMP(3),
ADD COLUMN     "suspended_by_user_id" TEXT,
ADD COLUMN     "suspended_reason" TEXT;

-- AlterTable
ALTER TABLE "suspended_sale_items" ALTER COLUMN "unitPrice" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "total" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "suspended_sales" ALTER COLUMN "total" SET DATA TYPE DECIMAL(12,2);

-- DropTable
DROP TABLE "business_type_module_defaults";

-- DropTable
DROP TABLE "business_types";

-- DropTable
DROP TABLE "customers";

-- DropTable
DROP TABLE "module_permissions";

-- DropTable
DROP TABLE "modules";

-- DropTable
DROP TABLE "store_modules";

-- DropEnum
DROP TYPE "CustomerType";

-- CreateIndex
CREATE INDEX "devolucion_detalles_saleItemId_idx" ON "devolucion_detalles"("saleItemId");

-- AddForeignKey
ALTER TABLE "devolucion_detalles" ADD CONSTRAINT "devolucion_detalles_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "sale_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
