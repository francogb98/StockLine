import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "session-token";

const PROTECTED_API_PREFIXES = [
  "/api/categories",
  "/api/products",
  "/api/sales",
  "/api/suspended-sales",
  "/api/subscription",
  "/api/auth/users",
  "/api/auth/me",
  "/api/auth/hash-password",
  "/api/onboarding",
  "/api/cash-sessions",
  "/api/stock-movements",
];

function isProtectedApiRoute(pathname: string) {
  return PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );

  const isProtectedApi = isProtectedApiRoute(pathname);

  if (isProtectedApi && !hasSessionCookie) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/api/:path*"],
};
