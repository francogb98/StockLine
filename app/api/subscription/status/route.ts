import { NextRequest } from "next/server";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireAuthenticatedSession } from "@/lib/api-auth";
import { resolveSubscriptionSnapshot } from "@/lib/subscription-service";
import { isTestUserEmail } from "@/lib/test-users";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthenticatedSession();
    if ("response" in auth) {
      return auth.response;
    }

    const snapshot = await resolveSubscriptionSnapshot(auth.auth.user.storeId);

    // Test users always see an active subscription (no expiry blocks)
    if (isTestUserEmail(auth.auth.user.email)) {
      return jsonResponse({ ...snapshot, status: "active" as const });
    }

    return jsonResponse(snapshot);
  } catch (error) {
    console.error("GET /api/subscription/status", error);
    return errorResponse("Error obteniendo estado de suscripción", 500);
  }
}
