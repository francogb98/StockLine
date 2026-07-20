"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface BrandLogoProps {
  showText?: boolean;
  className?: string;
}

export function BrandLogo({ showText = true, className }: BrandLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  if (showText) {
    return (
      <img
        src={isDark ? "/logo-horizontal-dark(1).svg" : "/logo-horizontal.svg"}
        alt="StockLine"
        className={cn("object-contain", className)}
      />
    );
  }

  return (
    <img
      src={isDark ? "/icon-dark.svg" : "/icon.svg"}
      alt="StockLine"
      className={cn("object-contain", className)}
    />
  );
}
