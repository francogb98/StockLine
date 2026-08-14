"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function SuperAdminLogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // continue — cookie is already gone or request failed
    }
    window.location.href = "/login";
  };

  return (
    <Button variant="ghost" size="sm" type="button" onClick={handleLogout} disabled={isLoggingOut}>
      <LogOut className="mr-2 h-4 w-4" />
      {isLoggingOut ? "Cerrando..." : "Salir"}
    </Button>
  );
}
