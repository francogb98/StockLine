import type { ComponentType } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

type Tone = "primary" | "success" | "warning";

export interface MetricCardProps {
  title: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  tone?: Tone;
  hint?: string;
}

const TONE_CLASSES: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
  warning: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
};

export function MetricCard({ title, value, icon: Icon, tone = "primary", hint }: MetricCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <span className={`rounded-full p-1.5 ${TONE_CLASSES[tone]}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
      {hint && (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

export interface TrendCardProps {
  title: string;
  value: string;
  trend: number;
  icon: ComponentType<{ className?: string }>;
  tone?: Tone;
}

export function TrendCard({ title, value, trend, icon: Icon, tone = "primary" }: TrendCardProps) {
  const isPositive = trend >= 0;
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <span className={`rounded-full p-1.5 ${TONE_CLASSES[tone]}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
      <div className="mt-1 flex items-center gap-1 text-xs">
        {isPositive ? (
          <TrendingUp className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
        ) : (
          <TrendingDown className="h-3.5 w-3.5 text-destructive" />
        )}
        <span className={isPositive ? "text-[hsl(var(--success))]" : "text-destructive"}>
          {isPositive ? "+" : ""}{trend}%
        </span>
      </div>
    </div>
  );
}
