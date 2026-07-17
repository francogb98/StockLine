-- CreateTable
CREATE TABLE "suspended_sales" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suspended_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suspended_sale_items" (
    "id" TEXT NOT NULL,
    "suspendedSaleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "suspended_sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suspended_sales_storeId_createdAt_idx" ON "suspended_sales"("storeId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "suspended_sale_items_suspendedSaleId_idx" ON "suspended_sale_items"("suspendedSaleId");

-- AddForeignKey
ALTER TABLE "suspended_sales" ADD CONSTRAINT "suspended_sales_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspended_sales" ADD CONSTRAINT "suspended_sales_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspended_sale_items" ADD CONSTRAINT "suspended_sale_items_suspendedSaleId_fkey" FOREIGN KEY ("suspendedSaleId") REFERENCES "suspended_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
