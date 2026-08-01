"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { MobileHeader } from "./mobile-header";
import { MobileBottomNavigation } from "./mobile-bottom-navigation";
import { AssistantPanel } from "@/components/mobile-assistant/panel";

export function MobileLayout({ children }: { children: ReactNode }) {
  const [bottomNavHeight, setBottomNavHeight] = useState(72);

  return (
    <div
      className="min-h-screen bg-background"
      style={
        {
          "--bottom-nav-height": `${bottomNavHeight}px`,
        } as CSSProperties
      }
    >
      <MobileHeader />
      <main
        className="flex min-h-screen flex-col pt-[72px]"
        style={{ paddingBottom: "var(--bottom-nav-height)" }}
      >
        {children}
      </main>
      <MobileBottomNavigation onHeightChange={setBottomNavHeight} />
      <AssistantPanel />
    </div>
  );
}
