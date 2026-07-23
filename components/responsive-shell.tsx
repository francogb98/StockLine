"use client";

import { type ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileLayout } from "./mobile-layout";

interface ResponsiveShellProps {
  children: ReactNode;
}

export function ResponsiveShell({ children }: ResponsiveShellProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileLayout>{children}</MobileLayout>;
  }

  return <>{children}</>;
}
