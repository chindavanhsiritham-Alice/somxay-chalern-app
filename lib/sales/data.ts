import type { SupabaseClient } from '@supabase/supabase-js'
import type { ProductTierPrice, QuotationCurrency } from './types'

export const QUOTATIONS_PAGE_SIZE = 25

export function todayDateString() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10)
}

export function monthStartIso() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

export async function getTierPrices(supabase: SupabaseClient): Promise<ProductTierPrice[]> {
  const { data } = await supabase.from('product_tier_prices').select('*')
  return (data ?? []) as ProductTierPrice[]
}

export function tierPriceFor(
  tierPrices: ProductTierPrice[],
  productId: string | number,
  tier: string | null | undefined,
  currency: QuotationCurrency
): number | null {
  if (!tier) return null
  const row = tierPrices.find((p) => String(p.product_id) === String(productId) && p.tier === tier)
  if (!row) return null
  const key = currency === 'USD' ? 'price_usd' : currency === 'THB' ? 'price_thb' : 'price_lak'
  const value = row[key]
  return value == null ? null : Number(value)
}

export function publicPriceFor(
  product: { public_price_usd?: number | null; public_price_thb?: number | null; public_price_lak?: number | null } | undefined,
  currency: QuotationCurrency
): number {
  if (!product) return 0
  const key = currency === 'USD' ? 'public_price_usd' : currency === 'THB' ? 'public_price_thb' : 'public_price_lak'
  return Number(product[key] ?? 0)
}
