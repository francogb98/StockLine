"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Algo salió mal</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ha ocurrido un error inesperado. Por favor, intentá de nuevo.
        </p>
        <button
          onClick={reset}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
