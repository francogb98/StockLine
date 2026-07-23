"use client";

import type { ReactNode } from "react";
import { MobileHeader } from "./mobile-header";
import { MobileBottomNavigation } from "./mobile-bottom-navigation";
import { FloatingAssistant } from "@/components/mobile-assistant/floating-assistant";

export function MobileLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <MobileHeader />
      <main className="min-h-screen pt-[52px] pb-[72px]">
        {children}
      </main>
      <MobileBottomNavigation />
      <FloatingAssistant />
    </div>
  );
}
