import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <BrandLogo className="mb-4 w-40" />
      <FileQuestion className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <p className="max-w-md text-center text-muted-foreground">
        La página que buscás no existe o fue movida.
      </p>
      <Button asChild>
        <Link href="/app/pos">Volver al inicio</Link>
      </Button>
    </div>
  );
}
