"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"

export function ForceLightMode() {
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    if (theme !== "light") {
      setTheme("light")
    }
  }, [theme, setTheme])

  return null
}
