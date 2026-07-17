-- CreateIndex
CREATE INDEX "cash_sessions_storeId_closedAt_idx" ON "cash_sessions"("storeId", "closedAt");

-- CreateIndex
CREATE INDEX "sale_items_saleId_idx" ON "sale_items"("saleId");

-- CreateIndex
CREATE INDEX "sales_storeId_createdAt_idx" ON "sales"("storeId", "createdAt" DESC);
