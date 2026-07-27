"use client";

import type { ReactNode } from "react";
import { MobileHeader } from "./mobile-header";
import { MobileBottomNavigation } from "./mobile-bottom-navigation";
import { AssistantProvider } from "@/components/mobile-assistant/context";
import { AssistantPanel } from "@/components/mobile-assistant/panel";

export function MobileLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AssistantProvider>
        <MobileHeader />
        <main className="min-h-screen pt-[52px] pb-[72px]">
          {children}
        </main>
        <MobileBottomNavigation />
        <AssistantPanel />
      </AssistantProvider>
    </div>
  );
}
