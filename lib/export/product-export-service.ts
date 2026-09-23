import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

export interface ExportProductRow {
  "Código de barras": string;
  "Nombre": string;
  "Descripción": string;
  "Categoría": string;
  "Precio": number;
  "Costo": number;
  "Stock": number;
  "Stock mínimo": number;
  "Tipo de cantidad": string;
  "Unidad": string;
}

export async function generateProductExport(storeId: string): Promise<Buffer> {
  const products = await prisma.product.findMany({
    where: { storeId },
    include: {
      category: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  const rows: ExportProductRow[] = products.map((p) => ({
    "Código de barras": p.barcode ?? "",
    "Nombre": p.name,
    "Descripción": p.description ?? "",
    "Categoría": p.category?.name ?? "",
    "Precio": Number(p.price),
    "Costo": Number(p.cost),
    "Stock": Number(p.stock),
    "Stock mínimo": Number(p.minStock),
    "Tipo de cantidad": p.quantityType === "DISCRETA" ? "Discreta" : "Continua",
    "Unidad": p.unit,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto-size columns
  const colWidths = Object.keys(rows[0] ?? {}).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...rows.map((r) => String((r as any)[key] ?? "").length),
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buffer);
}
