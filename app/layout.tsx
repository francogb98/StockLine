import React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'

import './globals.css'
import { StoreProvider } from '@/lib/store-context'
import { CashControlProvider } from '@/lib/cash-control-context'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: {
    default: 'StockLine',
    template: '%s | StockLine',
  },
  description: 'Sistema inteligente para gestión de stock, ventas e inventario.',
  applicationName: 'StockLine',
  keywords: ['stock', 'inventario', 'punto de venta', 'POS', 'ventas', 'negocio', 'comercio'],
  authors: [{ name: 'StockLine' }],
  creator: 'StockLine',
  publisher: 'StockLine',
  robots: 'index,follow',
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'StockLine',
    description: 'Sistema inteligente para gestionar inventario, ventas y stock desde cualquier lugar.',
    type: 'website',
    locale: 'es_AR',
    siteName: 'StockLine',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StockLine',
    description: 'Sistema inteligente para gestionar inventario, ventas y stock desde cualquier lugar.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  userScalable: false,
  themeColor: '#2563EB',
}

const publicThemeCleanupScript = `
(function() {
  try {
    var path = window.location.pathname;
    if (!path.startsWith('/app')) {
      document.documentElement.classList.remove('dark', 'light');
    }
  } catch(e) {}
})()
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: publicThemeCleanupScript }} />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <StoreProvider>
            <CashControlProvider>{children}</CashControlProvider>
          </StoreProvider>
        </ThemeProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}
