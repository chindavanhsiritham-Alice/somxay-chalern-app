'use client'

import { useMemo, useSyncExternalStore } from 'react'

// Client-side cart persisted in localStorage. Each line is a catalog product
// plus a chosen quantity in kg. Totals are computed from the stored prices.

export interface CartItem {
  catalog_product_id: string
  name: string
  grade: string | null
  unit_price_usd: number | null
  unit_price_thb: number | null
  unit_price_lak: number | null
  available_kg: number | null
  quantity_kg: number
}

const KEY = 'somxay_cart_v1'

function read(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as CartItem[]) : []
  } catch {
    return []
  }
}

function write(items: CartItem[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY, JSON.stringify(items))
  window.dispatchEvent(new Event('cart-updated'))
}

export const cart = {
  get: read,
  count(): number {
    return read().length
  },
  add(item: CartItem) {
    const items = read()
    const existing = items.find((i) => i.catalog_product_id === item.catalog_product_id)
    if (existing) {
      existing.quantity_kg += item.quantity_kg
    } else {
      items.push(item)
    }
    write(items)
  },
  setQuantity(id: string, quantity_kg: number) {
    const items = read().map((i) => (i.catalog_product_id === id ? { ...i, quantity_kg } : i))
    write(items)
  },
  remove(id: string) {
    write(read().filter((i) => i.catalog_product_id !== id))
  },
  clear() {
    write([])
  },
}

export function cartTotals(items: CartItem[]) {
  return items.reduce(
    (acc, i) => ({
      usd: acc.usd + i.quantity_kg * (i.unit_price_usd ?? 0),
      thb: acc.thb + i.quantity_kg * (i.unit_price_thb ?? 0),
      lak: acc.lak + i.quantity_kg * (i.unit_price_lak ?? 0),
    }),
    { usd: 0, thb: 0, lak: 0 }
  )
}

// --- React store binding (avoids setState-in-effect) ------------------------

function subscribe(callback: () => void) {
  window.addEventListener('cart-updated', callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener('cart-updated', callback)
    window.removeEventListener('storage', callback)
  }
}

// Returns the raw serialized cart — a stable string compared by value, so React
// only re-renders when the contents actually change.
function getSnapshot(): string {
  if (typeof window === 'undefined') return '[]'
  return window.localStorage.getItem(KEY) ?? '[]'
}

function getServerSnapshot(): string {
  return '[]'
}

function parse(raw: string): CartItem[] {
  try {
    return JSON.parse(raw) as CartItem[]
  } catch {
    return []
  }
}

export function useCart(): CartItem[] {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return useMemo(() => parse(raw), [raw])
}

export function useCartCount(): number {
  const items = useCart()
  return items.length
}
