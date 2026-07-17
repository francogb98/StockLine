"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface KeyboardHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardHelpModal({
  open,
  onOpenChange,
}: KeyboardHelpModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Atajos de teclado</DialogTitle>
          <DialogDescription>
            Acelera tu trabajo con estos atajos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Globales
            </h4>
            <div className="space-y-2">
              <ShortcutRow keys="Alt+F" description="Buscar productos" />
              <ShortcutRow keys="Alt+D" description="Navegar productos" />
              <ShortcutRow keys="Alt+C" description="Cobrar" />
              <ShortcutRow keys="Alt+P" description="Seleccionar pago" />
              <ShortcutRow keys="ESC" description="Volver a buscar / Cancelar" />
              <ShortcutRow keys="Alt+H" description="Mostrar esta ayuda" />
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Productos
            </h4>
            <div className="space-y-2">
              <ShortcutRow keys="← → ↑ ↓" description="Navegar productos" />
              <ShortcutRow keys="Enter" description="Agregar al carrito" />
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Carrito
            </h4>
            <div className="space-y-2">
              <ShortcutRow keys="↑ ↓" description="Seleccionar item" />
              <ShortcutRow keys="*" description="Aumentar cantidad" />
              <ShortcutRow keys="-" description="Disminuir cantidad" />
              <ShortcutRow keys="Delete" description="Eliminar item" />
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pago
            </h4>
            <div className="space-y-2">
              <ShortcutRow keys="1" description="Efectivo" />
              <ShortcutRow keys="2" description="Tarjeta" />
              <ShortcutRow keys="3" description="Transferencia" />
              <ShortcutRow keys="Enter" description="Confirmar pago" />
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShortcutRow({
  keys,
  description,
}: {
  keys: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{description}</span>
      <kbd className="rounded border bg-muted px-2 py-0.5 font-mono text-xs font-medium tabular-nums">
        {keys}
      </kbd>
    </div>
  );
}
