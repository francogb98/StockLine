import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSuperAdmin } from "@/lib/api-auth";

export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if ("response" in auth) return auth.response;

    return jsonResponse(
      {
        id: auth.auth.user.id,
        email: auth.auth.user.email,
        name: auth.auth.user.name,
        role: auth.auth.user.role,
        storeId: auth.auth.user.storeId,
        isSuperAdmin: true,
      },
      200,
    );
  } catch (error) {
    console.error("GET /api/super-admin/me", error);
    return errorResponse("Error interno del servidor", 500);
  }
}
