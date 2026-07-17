import React from "react"
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'StockLine - Control de Stock y Ventas para tu Negocio',
  description:
    'El sistema de punto de venta más simple para comercios. Controlá tu stock, registrá ventas y gestioná tu negocio desde el navegador. Probá gratis por 30 días.',
  openGraph: {
    title: 'StockLine - Control de Stock y Ventas para tu Negocio',
    description:
      'El sistema de punto de venta más simple para comercios. Controlá tu stock, registrá ventas y gestioná tu negocio desde el navegador.',
    type: 'website',
  },
}

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
