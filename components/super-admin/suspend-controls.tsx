"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const REASONS = [
  { value: "MANUAL_ADMIN", label: "Manual admin" },
  { value: "PAYMENT_FRAUD", label: "Fraude de pago" },
  { value: "POLICY_VIOLATION", label: "Violación de políticas" },
  { value: "OTHER", label: "Otro" },
];

export function SuspendControls({
  storeId,
  initialSuspended,
  initialReason,
  initialNotes,
}: {
  storeId: string;
  initialSuspended: boolean;
  initialReason: string | null;
  initialNotes: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("MANUAL_ADMIN");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitSuspend() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/super-admin/companies/${storeId}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, notes: notes || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitUnsuspend() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/super-admin/companies/${storeId}/unsuspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!initialSuspended && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-destructive px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive hover:text-destructive-foreground"
        data-testid="open-suspend-dialog"
      >
        Suspender tienda
      </button>
    );
  }

  if (!initialSuspended && open) {
    return (
      <div className="rounded-lg border bg-card p-4 space-y-3" data-testid="suspend-form">
        <h3 className="text-sm font-semibold">Suspender tienda</h3>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Motivo</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
            data-testid="suspend-reason"
          >
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Notas internas (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="rounded-md border bg-background p-2 text-sm"
            data-testid="suspend-notes"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={submitSuspend}
            disabled={submitting}
            className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground disabled:opacity-50"
            data-testid="confirm-suspend"
          >
            {submitting ? "Suspendiendo..." : "Confirmar suspensión"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={submitting}
            className="rounded-md border px-3 py-1.5 text-sm font-medium"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (initialSuspended) {
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
          <p className="font-semibold text-destructive">Tienda suspendida</p>
          {initialReason && (
            <p className="mt-1 text-xs text-muted-foreground">Motivo: <code>{initialReason}</code></p>
          )}
          {initialNotes && (
            <p className="mt-1 text-xs text-muted-foreground">Notas: {initialNotes}</p>
          )}
        </div>
        <button
          type="button"
          onClick={submitUnsuspend}
          disabled={submitting}
          className="rounded-md border border-[hsl(var(--success))] px-3 py-1.5 text-sm font-medium text-[hsl(var(--success))] hover:bg-[hsl(var(--success))] hover:text-white disabled:opacity-50"
          data-testid="confirm-unsuspend"
        >
          {submitting ? "Reactivando..." : "Reactivar tienda"}
        </button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return null;
}
