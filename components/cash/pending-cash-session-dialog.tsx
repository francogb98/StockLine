"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Coins,
  CalendarDays,
  User as UserIcon,
} from "lucide-react";
import { CloseCashDialog } from "./close-cash-dialog";
import { formatCurrency } from "@/lib/mock-data";

interface PendingCashSession {
  id: string;
  userName: string;
  openingAmount: number;
  createdAt: string;
  salesCount: number;
  currentCashTotal: number;
  currentTotal: number;
}

interface PendingCashSessionDialogProps {
  open: boolean;
  session: PendingCashSession;
  onClose: () => void;
  onSessionClosed: () => void;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PendingCashSessionDialog({
  open,
  session,
  onClose,
  onSessionClosed,
}: PendingCashSessionDialogProps) {
  const [showClose, setShowClose] = useState(false);

  if (showClose) {
    return (
      <CloseCashDialog
        open={showClose}
        onOpenChange={(v) => {
          if (!v) setShowClose(false);
        }}
        session={{
          id: session.id,
          openingAmount: session.openingAmount,
          currentCashTotal: session.currentCashTotal,
          currentTotal: session.currentTotal,
          salesCount: session.salesCount,
          userName: session.userName,
        }}
        onSessionClosed={onSessionClosed}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Caja sin cerrar
          </DialogTitle>
          <DialogDescription>
            La caja del turno anterior aún no fue cerrada. Cerrá la caja antes
            de operar para mantener el control.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Detalles de la caja abierta
            </p>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Abrió:</span>
                <span className="font-medium">{session.userName}</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Fecha:</span>
                <span className="font-medium">{formatDate(session.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Monto inicial:</span>
                <span className="font-medium">
                  {formatCurrency(session.openingAmount)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 text-muted-foreground flex items-center justify-center text-xs font-bold">
                  #
                </span>
                <span className="text-muted-foreground">Ventas:</span>
                <span className="font-medium">{session.salesCount}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Podés cerrar la caja ahora o hacerlo después desde el panel
            principal.
          </p>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Ahora no
            </button>
            <button
              type="button"
              onClick={() => setShowClose(true)}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Coins className="h-4 w-4" />
              Cerrar Caja
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
