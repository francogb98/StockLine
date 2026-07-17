"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function ErrorPage({
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <AlertTriangle className="h-16 w-16 text-destructive" />
      <h1 className="text-2xl font-semibold">Algo salió mal</h1>
      <p className="max-w-md text-center text-muted-foreground">
        Ocurrió un error inesperado. Ya lo registramos y lo vamos a revisar.
      </p>
      <Button onClick={reset}>Intentar de nuevo</Button>
    </div>
  );
}
