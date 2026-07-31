import React from "react"
import { ForceLightMode } from "@/components/force-light-mode"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{ colorScheme: "light" }} className="bg-white text-slate-900">
      <ForceLightMode />
      {children}
    </div>
  )
}
