import { NextResponse, type NextRequest } from "next/server";
import { invalidateCurrentSession, getAuthenticatedSession } from "@/lib/auth-session";
import { recordAuditEvent, extractAuditContext } from "@/lib/audit-service";

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthenticatedSession();
    await invalidateCurrentSession();
    if (session) {
      const { ipAddress, userAgent } = extractAuditContext(req);
      void recordAuditEvent({
        actorType: "STORE_USER",
        actorUserId: session.user.id,
        storeId: session.user.storeId,
        action: "user.logout",
        targetType: "User",
        targetId: session.user.id,
        ipAddress,
        userAgent,
      }).catch(() => {});
    }
    return NextResponse.json({ message: "Logout exitoso" }, { status: 200 });
  } catch (error) {
    console.error("Error cerrando sesión:", error);
    return NextResponse.json(
      { error: "Error al cerrar sesión" },
      { status: 500 },
    );
  }
}
