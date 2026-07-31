import { cn } from "@/lib/utils";

interface BrandLogoProps {
  showText?: boolean;
  className?: string;
}

export function BrandLogo({ showText = true, className }: BrandLogoProps) {
  if (!showText) {
    return (
      <img
        src="/IsoTipo.svg"
        alt="StockLine"
        className={cn("object-contain", className)}
      />
    );
  }

  return (
    <div className={cn("brand-container", className)}>
      <img src="/IsoTipo.svg" alt="StockLine" className="brand-svg" />
      <div className="brand-text">
        <h1 className="brand-name">
          Stock<span className="brand-line">Line</span>
        </h1>
        <span className="brand-slogan">GESTIÓN & VENTAS</span>
      </div>
    </div>
  );
}
