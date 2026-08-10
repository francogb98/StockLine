-- AlterEnum: agregar CUSTOMER_RETURN al enum de movimientos de stock
ALTER TYPE "MovementType" ADD VALUE 'CUSTOMER_RETURN';

-- CreateEnum: disposición de un item devuelto
CREATE TYPE "DevolucionDisposicion" AS ENUM ('REINGRESAR_STOCK', 'MERMAR');

-- CreateTable: devoluciones
CREATE TABLE "devoluciones" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivo" TEXT,
    "observaciones" TEXT,
    "montoTotalDevuelto" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devoluciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable: detalles de devoluciones
CREATE TABLE "devolucion_detalles" (
    "id" TEXT NOT NULL,
    "devolucionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "saleItemId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "disposicion" "DevolucionDisposicion" NOT NULL DEFAULT 'REINGRESAR_STOCK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devolucion_detalles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "devoluciones_storeId_fecha_idx" ON "devoluciones"("storeId", "fecha" DESC);
CREATE INDEX "devoluciones_storeId_ventaId_idx" ON "devoluciones"("storeId", "ventaId");
CREATE INDEX "devoluciones_userId_fecha_idx" ON "devoluciones"("userId", "fecha" DESC);

CREATE INDEX "devolucion_detalles_devolucionId_idx" ON "devolucion_detalles"("devolucionId");
CREATE INDEX "devolucion_detalles_productId_idx" ON "devolucion_detalles"("productId");

-- AddForeignKey
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "devolucion_detalles" ADD CONSTRAINT "devolucion_detalles_devolucionId_fkey" FOREIGN KEY ("devolucionId") REFERENCES "devoluciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devolucion_detalles" ADD CONSTRAINT "devolucion_detalles_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
