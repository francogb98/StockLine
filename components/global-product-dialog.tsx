"use client";

import { useEffect, useState } from "react";
import { ProductDialog } from "@/components/stock/product-dialog";

export function GlobalProductDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener("open-product-dialog", handleOpen);
    return () => window.removeEventListener("open-product-dialog", handleOpen);
  }, []);

  return (
    <ProductDialog open={open} onClose={() => setOpen(false)} product={null} />
  );
}
