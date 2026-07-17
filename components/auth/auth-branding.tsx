import { BrandLogo } from "@/components/brand-logo"
import { AuthIllustration } from "./auth-illustration"
import { AuthBenefits } from "./auth-benefits"

export function AuthBranding() {
  return (
    <div className="relative flex h-full flex-col bg-gradient-to-br from-primary/[0.07] via-blue-400/[0.05] to-blue-300/[0.03] dark:from-primary/[0.10] dark:via-blue-400/[0.07] dark:to-blue-300/[0.04] p-6 lg:p-10 xl:p-12">
      <div className="space-y-4">
        <BrandLogo className="w-52" />

        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold tracking-tight text-foreground/90">
            Controlá tu negocio desde cualquier lugar.
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground/70 max-w-sm">
            Gestioná inventario, ventas y productos desde una única plataforma, estés donde estés.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center py-4 lg:py-8">
        <AuthIllustration />
      </div>

      <div className="shrink-0">
        <AuthBenefits />
      </div>
    </div>
  )
}
