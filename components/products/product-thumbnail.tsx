import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductThumbnailProps {
  imageUrl?: string | null;
  name?: string;
  className?: string;
  iconClassName?: string;
}

export function ProductThumbnail({
  imageUrl,
  name,
  className,
  iconClassName,
}: ProductThumbnailProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name ? `Imagen de ${name}` : "Imagen del producto"}
        className={cn("object-cover", className)}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-muted text-muted-foreground/60",
        className,
      )}
    >
      <Package className={cn("h-1/2 w-1/2", iconClassName)} />
    </div>
  );
}
