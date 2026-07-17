"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { useAuth } from "@/lib/store-context";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type BadgeVariant = "desktop" | "mobile";

interface SubscriptionStatusBadgeProps {
  variant?: BadgeVariant;
  onNavigate?: () => void;
  className?: string;
}

type StatusKey = "active" | "trial" | "past_due" | "canceled";

interface StatusPresentation {
  label: string;
  dateKind: "renewal" | "trial-end" | "expired" | null;
  classes: string;
  dotClasses: string;
}

const STATUS_PRESENTATION: Record<StatusKey, StatusPresentation> = {
  active: {
    label: "Activa",
    dateKind: "renewal",
    classes:
      "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500 dark:bg-emerald-700 dark:hover:bg-emerald-600",
    dotClasses: "bg-white/80",
  },
  trial: {
    label: "Trial",
    dateKind: "trial-end",
    classes:
      "bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-500 dark:bg-amber-600 dark:hover:bg-amber-500",
    dotClasses: "bg-white/70",
  },
  past_due: {
    label: "Vencida",
    dateKind: "expired",
    classes:
      "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive",
    dotClasses: "bg-white/80",
  },
  canceled: {
    label: "Cancelada",
    dateKind: null,
    classes:
      "bg-muted text-muted-foreground hover:bg-muted/80 focus-visible:ring-ring border border-border",
    dotClasses: "bg-muted-foreground/70",
  },
};

function getStatusKey(status: string | undefined | null): StatusKey {
  if (status === "active" || status === "trial" || status === "canceled") {
    return status;
  }
  return "past_due";
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatShortDate(value: Date | null): string {
  if (!value) return "";
  try {
    return format(value, "MMM d, yyyy", { locale: enUS });
  } catch {
    return "";
  }
}

function buildDateLabel(
  presentation: StatusPresentation,
  date: Date | null,
): string {
  if (!presentation.dateKind || !date) return "";

  const formatted = formatShortDate(date);
  if (!formatted) return "";

  switch (presentation.dateKind) {
    case "renewal":
      return `Renueva el ${formatted}`;
    case "trial-end":
      return `Finaliza el ${formatted}`;
    case "expired":
      return `Vencio el ${formatted}`;
  }
}

export function SubscriptionStatusBadge({
  variant = "desktop",
  onNavigate,
  className,
}: SubscriptionStatusBadgeProps) {
  const { subscription, isSessionLoading } = useAuth();

  const presentation = useMemo(() => {
    if (!subscription) return null;
    return STATUS_PRESENTATION[getStatusKey(subscription.status)];
  }, [subscription]);

  const targetDate = useMemo(() => {
    if (!subscription || !presentation) return null;
    if (presentation.dateKind === "trial-end") {
      return toDate(subscription.trialEndsAt);
    }
    return toDate(subscription.currentPeriodEnd);
  }, [subscription, presentation]);

  if (isSessionLoading) {
    if (variant === "mobile") {
      return <Skeleton className="h-5 w-16 rounded-full" />;
    }
    return <Skeleton className="h-8 w-24 rounded-full" />;
  }

  if (!subscription || !presentation) {
    return null;
  }

  const dateLabel = buildDateLabel(presentation, targetDate);
  const isClickable = variant === "desktop" && Boolean(onNavigate);

  if (variant === "mobile") {
    return (
      <span
        data-testid="subscription-status-badge-mobile"
        data-status={getStatusKey(subscription.status)}
        aria-label={`Estado de la suscripcion: ${presentation.label}`}
        className={cn(
          "inline-flex h-5 items-center gap-1 rounded-full border border-transparent px-2 text-[10px] font-semibold leading-none tracking-wide",
          presentation.classes,
          className,
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            presentation.dotClasses,
          )}
        />
        {presentation.label}
      </span>
    );
  }

  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          presentation.dotClasses,
        )}
      />
      <span className="truncate font-semibold">{presentation.label}</span>
      {dateLabel ? (
        <>
          <span aria-hidden="true" className="opacity-70">
            &bull;
          </span>
          <span className="truncate font-normal opacity-95">{dateLabel}</span>
        </>
      ) : null}
    </>
  );

  if (isClickable) {
    return (
      <button
        type="button"
        onClick={onNavigate}
        data-testid="subscription-status-badge-desktop"
        data-status={getStatusKey(subscription.status)}
        aria-label={`${presentation.label}. ${dateLabel || "Ir a la suscripcion"}`}
        title="Ir a la suscripcion"
        className={cn(
          "inline-flex h-8 max-w-[280px] items-center gap-2 rounded-full border border-transparent px-3 text-xs",
          "cursor-pointer transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-card",
          presentation.classes,
          className,
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      data-testid="subscription-status-badge-desktop"
      data-status={getStatusKey(subscription.status)}
      aria-label={`Estado de la suscripcion: ${presentation.label}`}
      className={cn(
        "inline-flex h-8 max-w-[280px] items-center gap-2 rounded-full border border-transparent px-3 text-xs",
        presentation.classes,
        className,
      )}
    >
      {content}
    </span>
  );
}
