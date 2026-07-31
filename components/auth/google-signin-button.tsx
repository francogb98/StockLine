"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token: string; expires_in: number }) => void;
            error_callback?: (error: { type: string; message: string }) => void;
          }) => { requestAccessToken: (overrideConfig?: Record<string, unknown>) => void };
        };
      };
    };
  }
}

export function GoogleSignInButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("google-gsi-script")) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);
  }, []);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const handleGoogleSignIn = async () => {
    if (!window.google || !clientId) {
      setError("Google Sign-In no está disponible");
      return;
    }

    setIsLoading(true);
    setError(null);

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "openid email profile",
      callback: async (response) => {
        if (!response.access_token) {
          setError("Error al autenticar con Google");
          setIsLoading(false);
          return;
        }

        try {
          const res = await fetch("/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken: response.access_token }),
          });

          const data = await res.json();

          if (!res.ok) {
            setError(data.error || "Error al iniciar sesión con Google");
            setIsLoading(false);
            return;
          }

          window.location.href = "/app";
        } catch {
          setError("Error de conexión. Intentá nuevamente.");
          setIsLoading(false);
        }
      },
      error_callback: (err) => {
        setError(err.message || "Error al autenticar con Google");
        setIsLoading(false);
      },
    });

    client.requestAccessToken();
  };

  if (!clientId) {
    return null;
  }

  return (
    <div className="space-y-0">
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className={cn(
          "flex h-11 w-full items-center justify-center gap-2.5 rounded-xl bg-card border border-border",
          "text-sm font-medium text-foreground/90 shadow-sm",
          "hover:bg-muted hover:shadow-md",
          "active:scale-[0.98]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-all duration-200",
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        )}
        {isLoading ? "Conectando con Google..." : "Continuar con Google"}
      </button>

      {error && (
        <p className="mt-2 text-sm font-medium text-destructive text-center">{error}</p>
      )}

      {!scriptLoaded && !isLoading && (
        <p className="mt-1 text-xs text-center text-muted-foreground/50">Cargando...</p>
      )}
    </div>
  );
}

export function GoogleDivider() {
  return (
    <div className="relative my-4">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-card px-3 text-muted-foreground">o continuar con email</span>
      </div>
    </div>
  );
}
