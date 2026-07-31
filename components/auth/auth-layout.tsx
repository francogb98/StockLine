import type { ReactNode } from "react";
import { AuthBackground } from "./auth-background";

interface AuthLayoutProps {
  left: ReactNode;
  right: ReactNode;
}

export function AuthLayout({ left, right }: AuthLayoutProps) {
  return (
    <main className="relative grid lg:grid-cols-2 h-screen w-full overflow-hidden bg-background">
      <AuthBackground />

      {/* Columna Izquierda — Visual Showcase */}
      <div className="hidden lg:flex flex-col h-screen overflow-hidden pt-12 px-8 lg:px-12 pb-8 lg:pb-12 relative justify-center">
        {left}
        <div className="absolute right-0 top-0 bottom-0 w-24 lg:w-32 bg-gradient-to-r from-transparent to-background pointer-events-none z-10" />
      </div>

      {/* Columna Derecha — Formulario */}
      <div className="flex flex-col h-screen overflow-y-auto pt-12 px-8 lg:px-12 pb-8 lg:pb-12">
        <div className="w-full max-w-sm mx-auto">{right}</div>
      </div>
    </main>
  );
}
