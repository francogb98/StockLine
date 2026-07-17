import { errorResponse } from "@/lib/api-helpers";
import {
  getAuthenticatedSession,
  type AuthenticatedSession,
  type SessionUser,
} from "@/lib/auth-session";

type UserRole = "admin" | "employee";

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    "users:manage",
    "subscription:manage",
    "sales:detail",
    "inventory:write",
  ],
  employee: [],
};

export type Permission =
  | "users:manage"
  | "subscription:manage"
  | "sales:detail"
  | "inventory:write";

export type AuthResult =
  | { user: SessionUser; response?: never }
  | { user?: never; response: Response };

export type AuthSessionResult =
  | { auth: AuthenticatedSession; response?: never }
  | { auth?: never; response: Response };

function hasPermission(role: string, permission: Permission) {
  if (role !== "admin" && role !== "employee") {
    return false;
  }

  return ROLE_PERMISSIONS[role].includes(permission);
}

export async function requireAuthenticatedSession(): Promise<AuthSessionResult> {
  const authSession = await getAuthenticatedSession();

  if (!authSession) {
    return { response: errorResponse("No autenticado", 401) };
  }

  return { auth: authSession };
}

export async function requireStoreId(): Promise<
  | { storeId: string; response?: never }
  | { storeId?: never; response: Response }
> {
  const auth = await requireAuthenticatedSession();
  if (auth.response) {
    return { response: auth.response };
  }

  return { storeId: auth.auth.user.storeId };
}

export async function requireRole(
  roles: UserRole[],
): Promise<AuthSessionResult> {
  const auth = await requireAuthenticatedSession();

  if ("response" in auth) {
    return auth;
  }

  if (!roles.includes(auth.auth.user.role as UserRole)) {
    return {
      response: errorResponse(
        "No tenés permisos para realizar esta acción",
        403,
      ),
    };
  }

  return auth;
}

export async function requirePermission(
  permission: Permission,
): Promise<AuthSessionResult> {
  const auth = await requireAuthenticatedSession();

  if ("response" in auth) {
    return auth;
  }

  if (!hasPermission(auth.auth.user.role, permission)) {
    return {
      response: errorResponse(
        "No tenés permisos para realizar esta acción",
        403,
      ),
    };
  }

  return auth;
}

export async function requireSessionUser(): Promise<AuthResult> {
  const auth = await requireAuthenticatedSession();
  if (auth.response) {
    return { response: auth.response };
  }

  return { user: auth.auth.user };
}

export async function requireAdminSessionUser(): Promise<AuthResult> {
  const auth = await requireRole(["admin"]);

  if (auth.response) {
    return { response: auth.response };
  }

  return { user: auth.auth.user };
}
