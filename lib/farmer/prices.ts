import type { SupabaseClient } from '@supabase/supabase-js'
import { COFFEE_TYPES, type CoffeeType } from './types'

export interface CherryPriceRecord {
  coffee_type: CoffeeType
  price_per_kg: number
  updated_at: string | null
}

// Fallback values used until an admin saves a price (and if the table is empty).
export const DEFAULT_CHERRY_PRICES: Record<CoffeeType, number> = {
  'Arabica Cherry': 25,
  'Robusta Cherry': 18,
}

function isCoffeeType(value: string): value is CoffeeType {
  return (COFFEE_TYPES as readonly string[]).includes(value)
}

/**
 * Fetch today's cherry buying prices, keyed by coffee type. Falls back to
 * DEFAULT_CHERRY_PRICES for any type that is missing or if the table is
 * unavailable.
 */
export async function getCherryPrices(
  supabase: SupabaseClient
): Promise<Record<CoffeeType, CherryPriceRecord>> {
  const result = {} as Record<CoffeeType, CherryPriceRecord>
  for (const type of COFFEE_TYPES) {
    result[type] = { coffee_type: type, price_per_kg: DEFAULT_CHERRY_PRICES[type], updated_at: null }
  }

  const { data } = await supabase.from('cherry_prices').select('coffee_type, price_per_kg, updated_at')
  for (const row of (data ?? []) as { coffee_type: string; price_per_kg: number | string; updated_at: string | null }[]) {
    if (isCoffeeType(row.coffee_type) && row.price_per_kg != null) {
      result[row.coffee_type] = {
        coffee_type: row.coffee_type,
        price_per_kg: Number(row.price_per_kg),
        updated_at: row.updated_at,
      }
    }
  }

  return result
}
