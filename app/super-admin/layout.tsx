import { redirect } from "next/navigation";
import { getAuthenticatedSession } from "@/lib/auth-session";
import { ThemeProvider } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthenticatedSession();
  if (!session) redirect("/login");
  if (!session.user.isSuperAdmin) {
    return <ForbiddenPage />;
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="flex h-screen flex-col">
        <header className="flex items-center justify-between border-b px-6 py-3">
          <div className="font-semibold">Platform Admin</div>
          <form action="/api/auth/logout" method="POST">
            <Button variant="ghost" size="sm" type="submit">
              <LogOut className="mr-2 h-4 w-4" />
              Salir
            </Button>
          </form>
        </header>
        <div className="flex flex-1">
          <aside className="w-[235px] border-r p-4">
            <nav>
              <a
                href="/super-admin"
                className="block rounded px-3 py-2 hover:bg-muted"
              >
                Dashboard
              </a>
            </nav>
          </aside>
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </ThemeProvider>
  );
}

function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h1 className="text-lg font-semibold">403 — Acceso restringido</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta sección es exclusiva para Super Admins de plataforma.
        </p>
        <a
          href="/app"
          className="mt-4 inline-block text-sm text-primary underline"
        >
          Volver a tu tienda
        </a>
      </div>
    </div>
  );
}
