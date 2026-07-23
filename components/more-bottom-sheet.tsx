"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";
import { useAuth } from "@/lib/store-context";
import {
  Wallet,
  Users,
  Settings,
  CreditCard,
  LogOut,
} from "lucide-react";

interface MoreBottomSheetProps {
  open: boolean;
  onClose: () => void;
}

const moreItems = [
  { icon: Wallet, label: "Caja", href: "/app/cash-sessions" },
  { icon: Users, label: "Usuarios", href: "/app/users" },
  { icon: Settings, label: "Configuración", href: "/app/settings" },
  { icon: CreditCard, label: "Suscripción", href: "/app/subscription" },
];

export function MoreBottomSheet({ open, onClose }: MoreBottomSheetProps) {
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <Drawer open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DrawerContent>
        <div className="px-4 pb-8 pt-2">
          <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-muted-foreground/20" />
          <h2 className="mb-4 text-lg font-semibold">Más opciones</h2>
          <div className="space-y-0.5">
            {moreItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors hover:bg-muted"
                >
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          <hr className="my-4" />
          <button
            type="button"
            onClick={() => {
              onClose();
              logout();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <LogOut className="h-5 w-5" />
            Cerrar sesión
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
