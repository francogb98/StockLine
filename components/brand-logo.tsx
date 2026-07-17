"use client"

import { cn } from "@/lib/utils"

interface BrandLogoProps {
  showText?: boolean
  className?: string
}

export function BrandLogo({ showText = true, className }: BrandLogoProps) {
  if (showText) {
    return (
      <img
        src="/logo-horizontal.png"
        alt="StockLine"
        className={cn("object-contain", className)}
      />
    )
  }

  return (
    <img
      src="/icon.png"
      alt="StockLine"
      className={cn("object-contain", className)}
    />
  )
}
