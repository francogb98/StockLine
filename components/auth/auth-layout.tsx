import type { ReactNode } from "react"
import { AuthBackground } from "./auth-background"

interface AuthLayoutProps {
  left: ReactNode
  right: ReactNode
}

export function AuthLayout({ left, right }: AuthLayoutProps) {
  return (
    <main className="relative flex min-h-screen bg-background justify-center">
      <AuthBackground />

      <div className="flex w-full max-w-[1400px]">
        <div className="hidden md:flex w-1/2 lg:w-[55%] overflow-hidden relative">
          {left}
          <div className="absolute right-0 top-0 bottom-0 w-24 lg:w-32 bg-gradient-to-r from-transparent to-background pointer-events-none z-10" />
        </div>

        <div className="flex w-full md:w-1/2 lg:w-[45%] items-center justify-center p-4 lg:p-6 relative">
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-l from-transparent to-background pointer-events-none z-10" />
          <div className="w-full max-w-sm">
            {right}
          </div>
        </div>
      </div>
    </main>
  )
}
