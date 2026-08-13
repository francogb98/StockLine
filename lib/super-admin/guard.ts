import { errorResponse } from "@/lib/api-helpers";
import {
  getAuthenticatedSession,
  type AuthenticatedSession,
} from "@/lib/auth-session";

export type SuperAdminResult =
  | { auth: AuthenticatedSession & { isSuperAdmin: true }; response?: never }
  | { auth?: never; response: Response };

export async function requireSuperAdmin(): Promise<SuperAdminResult> {
  const auth = await getAuthenticatedSession();
  if (!auth) {
    return { response: errorResponse("No autenticado", 401) };
  }

  if (!auth.user.isSuperAdmin) {
    return { response: errorResponse("Acceso restringido a Super Admin", 403) };
  }
  return { auth: { ...auth, isSuperAdmin: true } };
}
