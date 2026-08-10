'use client'

import { useCallback, useEffect, useState } from 'react'

export interface DevolucionDetalle {
  id: string
  devolucionId: string
  productId: string
  productName?: string
  saleItemId: string
  cantidad: number
  precioUnitario: number
  subtotal: number
  disposicion: 'REINGRESAR_STOCK' | 'MERMAR'
  createdAt: string
}

export interface Devolucion {
  id: string
  storeId: string
  ventaId: string
  userId: string
  userName?: string
  fecha: string
  motivo: string | null
  observaciones: string | null
  montoTotalDevuelto: number
  createdAt: string
  updatedAt: string
  detalles: DevolucionDetalle[]
  ventaTotal?: number
}

export interface CreateDevolucionDetalleInput {
  saleItemId: string
  cantidad: number
  disposicion?: 'REINGRESAR_STOCK' | 'MERMAR'
}

export interface CreateDevolucionInput {
  ventaId: string
  motivo?: string
  observaciones?: string
  total?: boolean
  detalles: CreateDevolucionDetalleInput[]
}

export interface UseDevolucionesResult {
  items: Devolucion[]
  total: number
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  create: (input: CreateDevolucionInput) => Promise<Devolucion>
}

interface UseDevolucionesOptions {
  ventaId?: string
  limit?: number
  offset?: number
  autoLoad?: boolean
}

export function useDevoluciones(
  options: UseDevolucionesOptions = {},
): UseDevolucionesResult {
  const { ventaId, limit = 50, offset = 0, autoLoad = true } = options
  const [items, setItems] = useState<Devolucion[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (ventaId) params.set('ventaId', ventaId)
      params.set('limit', String(limit))
      params.set('offset', String(offset))
      const res = await fetch(`/api/devoluciones?${params.toString()}`, {
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Error ${res.status}`)
      }
      const data = (await res.json()) as { items: Devolucion[]; total: number }
      setItems(data.items)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [ventaId, limit, offset])

  const create = useCallback(
    async (input: CreateDevolucionInput): Promise<Devolucion> => {
      const res = await fetch('/api/devoluciones', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Error ${res.status}`)
      }
      const devolucion = (await res.json()) as Devolucion
      await refresh()
      return devolucion
    },
    [refresh],
  )

  useEffect(() => {
    if (autoLoad) {
      void refresh()
    }
  }, [autoLoad, refresh])

  return { items, total, loading, error, refresh, create }
}

export async function fetchDevolucion(id: string): Promise<Devolucion | null> {
  const res = await fetch(`/api/devoluciones/${id}`, { credentials: 'include' })
  if (res.status === 404) return null
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Error ${res.status}`)
  }
  return (await res.json()) as Devolucion
}