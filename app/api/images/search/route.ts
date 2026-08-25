import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";
import { isDemoSession } from "@/lib/auth-session";
import {
  getImageSearchProvider,
  isImageSearchConfigured,
} from "@/lib/image-search";

export async function POST(request: Request) {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;

    if (await isDemoSession()) {
      return errorResponse("No se pueden buscar imágenes en modo demo", 403);
    }

    if (!isImageSearchConfigured()) {
      return errorResponse("La búsqueda de imágenes no está configurada", 503);
    }

    const body = await request.json();
    const query = typeof body.query === "string" ? body.query.trim() : "";

    if (!query) {
      return errorResponse("La consulta de búsqueda es requerida", 400);
    }

    if (query.length > 200) {
      return errorResponse("La consulta es demasiado larga", 400);
    }

    const limit = typeof body.limit === "number" ? Math.min(body.limit, 20) : 10;

    const provider = getImageSearchProvider();
    const results = await provider.search(query, { limit });

    return jsonResponse({ results });
  } catch (error) {
    if (error instanceof Error && error.message === "SEARCH_RATE_LIMIT") {
      return errorResponse(
        "Se agotó el límite de búsquedas. Intentá más tarde.",
        429,
      );
    }
    console.error("POST /api/images/search", error);
    return errorResponse("Error al buscar imágenes", 500);
  }
}
