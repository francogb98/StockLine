"use client";

import Link from "next/link";
import { UserManagement } from "@/components/users/user-management";
import { ArrowLeft } from "lucide-react";

export default function UsersPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Link
          href="/app/settings"
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Configuración
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        <UserManagement />
      </div>
    </div>
  );
}
