"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewCouponPage() {
  const router = useRouter();
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED" | "FREE_TRIAL">("FREE_TRIAL");
  const [codeMode, setCodeMode] = useState<"auto" | "manual">("auto");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      discountType,
      description: formData.get("description") || undefined,
      isActive: true,
    };

    if (discountType === "FREE_TRIAL") {
      body.durationDays = Number(formData.get("durationDays"));
      body.generateCode = codeMode === "auto";
      if (codeMode === "manual") {
        body.code = formData.get("code");
      }
      body.discountValue = 0;
      body.maxRedemptions = 1;
    } else {
      body.code = formData.get("code");
      body.discountValue = Number(formData.get("discountValue"));
      body.durationDays = formData.get("durationDays") ? Number(formData.get("durationDays")) : undefined;
      body.maxRedemptions = formData.get("maxRedemptions") ? Number(formData.get("maxRedemptions")) : null;
    }

    const applicablePlans = formData.get("applicablePlans");
    body.applicablePlans = applicablePlans ? String(applicablePlans).split(",").map((s) => s.trim()).filter(Boolean) : [];

    const expiresAt = formData.get("expiresAt");
    if (expiresAt) body.expiresAt = String(expiresAt);

    try {
      const res = await fetch("/api/super-admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error ${res.status}`);
      }

      router.push("/super-admin/coupons");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error creando el cupón");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/super-admin/coupons" className="text-xs text-muted-foreground hover:underline">
          ← Cupones
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Nuevo cupón</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-6">
        <div>
          <label className="text-sm font-medium">Tipo de cupón</label>
          <select
            name="discountType"
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as typeof discountType)}
            className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="FREE_TRIAL">Período gratuito</option>
            <option value="PERCENTAGE">Porcentaje</option>
            <option value="FIXED">Monto fijo</option>
          </select>
        </div>

        {discountType === "FREE_TRIAL" && (
          <div>
            <label className="text-sm font-medium">Generación de código</label>
            <div className="mt-1 flex gap-3">
              <button
                type="button"
                onClick={() => setCodeMode("auto")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium border ${codeMode === "auto" ? "bg-primary text-primary-foreground" : "bg-background"}`}
              >
                Automático
              </button>
              <button
                type="button"
                onClick={() => setCodeMode("manual")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium border ${codeMode === "manual" ? "bg-primary text-primary-foreground" : "bg-background"}`}
              >
                Manual
              </button>
            </div>
            {codeMode === "auto" && (
              <p className="mt-1 text-xs text-muted-foreground">
                Se generará un código tipo <code>PRUEBA-3M-X8K29P</code>
              </p>
            )}
          </div>
        )}

        {(codeMode === "manual" || discountType !== "FREE_TRIAL") && (
          <div>
            <label className="text-sm font-medium">Código</label>
            <input
              name="code"
              required={codeMode === "manual" || discountType !== "FREE_TRIAL"}
              placeholder="PRUEBA-3-MESES"
              className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm font-mono uppercase"
            />
          </div>
        )}

        <div>
          <label className="text-sm font-medium">Descripción</label>
          <input
            name="description"
            placeholder="Descripción interna opcional"
            className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
          />
        </div>

        {discountType !== "FREE_TRIAL" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Tipo de descuento</label>
              <p className="mt-1 text-xs text-muted-foreground">
                {discountType === "PERCENTAGE" ? "Porcentaje" : "Monto fijo"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Valor</label>
              <input
                name="discountValue"
                type="number"
                step="0.01"
                min="0.01"
                required
                className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">
              {discountType === "FREE_TRIAL" ? "Días de prueba gratuita" : "Días de extensión"}
            </label>
            <input
              name="durationDays"
              type="number"
              defaultValue={discountType === "FREE_TRIAL" ? 90 : 30}
              min={1}
              max={365}
              required={discountType === "FREE_TRIAL"}
              className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>
          {discountType !== "FREE_TRIAL" && (
            <div>
              <label className="text-sm font-medium">Max redenciones (vacío = ilimitado)</label>
              <input
                name="maxRedemptions"
                type="number"
                min={1}
                className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
            </div>
          )}
          {discountType === "FREE_TRIAL" && (
            <div>
              <label className="text-sm font-medium">Uso único</label>
              <p className="mt-2 text-xs text-muted-foreground">
                Este código solo podrá utilizarse una vez.
              </p>
            </div>
          )}
        </div>

        {discountType !== "FREE_TRIAL" && (
          <div>
            <label className="text-sm font-medium">Planes aplicables (vacío = todos)</label>
            <input
              name="applicablePlans"
              placeholder="monthly,annual"
              className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>
        )}

        <div>
          <label className="text-sm font-medium">Vencimiento del código (opcional)</label>
          <input
            name="expiresAt"
            type="date"
            className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
          />
        </div>

        {error && (
          <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {submitting ? "Creando..." : "Crear cupón"}
          </button>
          <Link
            href="/super-admin/coupons"
            className="rounded-md border px-4 py-2 text-sm font-medium"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
