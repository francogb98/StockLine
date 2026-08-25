import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";
import {
  findGlobalProductByBarcode,
  findGlobalProductByKey,
  generateNormalizedKey,
} from "@/lib/data-access";

export async function GET(request: Request) {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;

    const url = new URL(request.url);
    const barcode = url.searchParams.get("barcode");
    const name = url.searchParams.get("name");
    const brand = url.searchParams.get("brand");
    const presentation = url.searchParams.get("presentation");
    const unit = url.searchParams.get("unit");

    if (!barcode && !name) {
      return errorResponse("Se requiere barcode o name", 400);
    }

    // Priority 1: search by barcode
    if (barcode) {
      const gp = await findGlobalProductByBarcode(barcode.trim());
      if (gp) {
        return jsonResponse({ found: true, globalProduct: gp });
      }
    }

    // Priority 2: search by normalized key
    if (name) {
      const key = generateNormalizedKey({
        name,
        brand,
        presentation,
        unit,
      });
      const gp = await findGlobalProductByKey(key);
      if (gp) {
        return jsonResponse({ found: true, globalProduct: gp });
      }
    }

    return jsonResponse({ found: false, globalProduct: null });
  } catch (error) {
    console.error("GET /api/global-products", error);
    return errorResponse("Error buscando producto global", 500);
  }
}
