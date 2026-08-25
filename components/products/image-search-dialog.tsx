"use client";

import { useState, useCallback } from "react";
import { Search, Loader2, X, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageSearchResult {
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  title: string;
  source: string;
}

interface ImageSearchDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
  initialQuery?: string;
}

export function ImageSearchDialog({
  open,
  onClose,
  onSelect,
  initialQuery = "",
}: ImageSearchDialogProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ImageSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    setResults([]);
    setSelectedUrl(null);

    try {
      const response = await fetch("/api/images/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), limit: 12 }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Error al buscar imágenes");
      }

      const data = await response.json();
      setResults(data.results || []);

      if (data.results?.length === 0) {
        setError("No se encontraron imágenes para esta búsqueda.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al buscar imágenes",
      );
    } finally {
      setIsSearching(false);
    }
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleSelect = (url: string) => {
    setSelectedUrl(url);
  };

  const handleConfirm = async () => {
    if (!selectedUrl) return;

    setIsDownloading(true);
    try {
      const response = await fetch("/api/images/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: selectedUrl }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Error al descargar la imagen");
      }

      const data = await response.json();
      onSelect(data.imageUrl);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al descargar la imagen",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 flex w-full max-w-2xl max-h-[80vh] flex-col overflow-hidden rounded-xl border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Buscar imagen en Internet</h2>
            <p className="text-xs text-muted-foreground">
              Buscá y seleccioná una imagen para el producto.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search bar */}
        <div className="shrink-0 border-b px-6 py-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ej: Coca Cola 2.25L..."
              className="flex-1 h-10 rounded-md border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Buscar
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {results.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {results.map((result, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelect(result.url)}
                  className={cn(
                    "group relative aspect-square overflow-hidden rounded-md border-2 transition-all",
                    selectedUrl === result.url
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-transparent hover:border-muted-foreground/30",
                  )}
                >
                  <img
                    src={result.thumbnailUrl || result.url}
                    alt={result.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "data:image/svg+xml;utf8," +
                        encodeURIComponent(
                          '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#e2e8f0"/><text x="50" y="55" font-family="sans-serif" font-size="10" fill="#94a3b8" text-anchor="middle">Error</text></svg>',
                        );
                    }}
                  />
                  {selectedUrl === result.url && (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                      <div className="rounded-full bg-primary p-1">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="truncate text-xs text-white">{result.source}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : !isSearching && !error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">
                Escribí el nombre del producto y hacé clic en Buscar.
              </p>
            </div>
          ) : null}

          {isSearching && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t bg-muted/20 px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {selectedUrl
                ? "Imagen seleccionada"
                : "Seleccioná una imagen de los resultados"}
            </p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="h-10 rounded-md border px-4 text-sm font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedUrl || isDownloading}
                className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Descargando...
                  </>
                ) : (
                  "Usar imagen"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
