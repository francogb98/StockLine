"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelSubscriptionControls({ subscriptionId, storeId }: { subscriptionId: string; storeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/super-admin/subscriptions/${subscriptionId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, reason, notes: notes || undefined }),
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

  return (
    <div className="space-y-2">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md border border-destructive px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive hover:text-destructive-foreground"
          data-testid="open-cancel-dialog"
        >
          Cancelar suscripción
        </button>
      ) : (
        <div className="rounded-lg border bg-card p-4 space-y-3" data-testid="cancel-form">
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs">
            <strong className="text-destructive">Atención:</strong> la cancelación es local — NO se cancela el preapproval en Mercado Pago.
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Motivo</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
              placeholder="fraude, manual, ..."
              data-testid="cancel-reason"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="rounded-md border bg-background p-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !reason}
              className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground disabled:opacity-50"
              data-testid="confirm-cancel"
            >
              {submitting ? "Cancelando..." : "Confirmar cancelación"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={submitting}
              className="rounded-md border px-3 py-1.5 text-sm font-medium"
            >
              Volver
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ExtendControls({ subscriptionId, storeId }: { subscriptionId: string; storeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [extraDays, setExtraDays] = useState("7");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/super-admin/subscriptions/${subscriptionId}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          extraDays: Number(extraDays),
          reason,
          notes: notes || undefined,
        }),
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

  return (
    <div className="space-y-2">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md border px-3 py-1.5 text-sm font-medium"
          data-testid="open-extend-dialog"
        >
          Extender
        </button>
      ) : (
        <div className="rounded-lg border bg-card p-4 space-y-3" data-testid="extend-form">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Días a extender (1-365)</label>
            <input
              type="number"
              min={1}
              max={365}
              value={extraDays}
              onChange={(e) => setExtraDays(e.target.value)}
              className="h-9 w-32 rounded-md border bg-background px-3 text-sm"
              data-testid="extend-days"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Motivo</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
              data-testid="extend-reason"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="rounded-md border bg-background p-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !reason || Number(extraDays) < 1}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
              data-testid="confirm-extend"
            >
              {submitting ? "Extendiendo..." : "Confirmar extensión"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={submitting}
              className="rounded-md border px-3 py-1.5 text-sm font-medium"
            >
              Volver
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SyncControls({ subscriptionId, storeId }: { subscriptionId: string; storeId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/super-admin/subscriptions/${subscriptionId}/sync-with-mp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId }),
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

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        data-testid="sync-with-mp"
      >
        {submitting ? "Sincronizando..." : "Forzar sync con Mercado Pago"}
      </button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
