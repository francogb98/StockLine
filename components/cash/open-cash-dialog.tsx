"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/mock-data";
import { toast } from "sonner";

interface OpenCashDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionCreated: (session: any) => void;
}

export function OpenCashDialog({
  open,
  onOpenChange,
  onSessionCreated,
}: OpenCashDialogProps) {
  const [openingAmount, setOpeningAmount] = useState("0");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/cash-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openingAmount: parseFloat(openingAmount) || 0,
          notes: notes || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Error al abrir caja");
        return;
      }

      toast.success("Caja abierta correctamente");
      onSessionCreated(data);
    } catch (error) {
      toast.error("Error de conexión al abrir caja");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-600" />
            Abrir Caja
          </DialogTitle>
          <DialogDescription>
            Registrá el monto inicial en efectivo para comenzar el turno.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">
              Monto inicial en efectivo
            </label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <input
                type="number"
                min="0"
                step="100"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                className="h-10 w-full rounded-md border bg-background pl-7 pr-4 text-right text-lg font-semibold tabular-nums focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="0"
              />
            </div>
            {parseFloat(openingAmount) > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Monto inicial: {formatCurrency(parseFloat(openingAmount))}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">
              Notas (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Ej: Turno mañana"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wallet className="h-4 w-4" />
              )}
              Abrir Caja
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
