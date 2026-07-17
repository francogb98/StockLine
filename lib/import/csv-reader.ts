import * as XLSX from "xlsx";

export interface ParsedFile {
  headers: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
  sheetName: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

export function getFileExtension(filename: string): string {
  const ext = filename.lastIndexOf(".");
  return ext >= 0 ? filename.substring(ext).toLowerCase() : "";
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  const ext = getFileExtension(file.name);

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Formato no soportado. Use: ${ALLOWED_EXTENSIONS.join(", ")}`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    const maxMB = MAX_FILE_SIZE / (1024 * 1024);
    return {
      valid: false,
      error: `El archivo supera el tamaño máximo de ${maxMB}MB`,
    };
  }

  return { valid: true };
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("El archivo no contiene hojas de cálculo");
  }

  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error("La hoja de cálculo está vacía");
  }

  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
    raw: false,
  });

  if (jsonData.length === 0) {
    throw new Error("El archivo no contiene datos");
  }

  const headers = Object.keys(jsonData[0]);

  return {
    headers,
    rows: jsonData,
    totalRows: jsonData.length,
    sheetName,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
