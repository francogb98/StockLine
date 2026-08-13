"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResolveErrorButton({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/super-admin/errors/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes || undefined }),
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

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-[hsl(var(--success))] px-2 py-0.5 text-xs text-[hsl(var(--success))] hover:bg-[hsl(var(--success))] hover:text-white"
        data-testid="open-resolve"
      >
        Marcar resuelto
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-md border bg-card p-2" data-testid="resolve-form">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="Notas de resolución (opcional)"
        className="w-48 rounded-md border bg-background p-1 text-xs"
      />
      {error && <p className="text-[10px] text-destructive">{error}</p>}
      <div className="flex gap-1">
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="rounded-md bg-[hsl(var(--success))] px-2 py-1 text-xs text-white disabled:opacity-50"
          data-testid="confirm-resolve"
        >
          {submitting ? "..." : "OK"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={submitting}
          className="rounded-md border px-2 py-1 text-xs"
        >
          X
        </button>
      </div>
    </div>
  );
}
