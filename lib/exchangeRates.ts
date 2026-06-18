import type { SupabaseClient } from '@supabase/supabase-js'

// USD-based currency pairs managed from the Exchange Rates admin page.
export const RATE_PAIRS = ['USD_THB', 'USD_LAK'] as const
export type RatePair = (typeof RATE_PAIRS)[number]

export interface RateRecord {
  pair: RatePair
  rate: number
  updated_at: string | null
}

export const RATE_LABELS: Record<RatePair, string> = {
  USD_THB: 'USD → THB',
  USD_LAK: 'USD → LAK',
}

// Fallback values used until an admin saves a rate (and if the table is empty).
export const DEFAULT_RATES: Record<RatePair, number> = {
  USD_THB: 33.6,
  USD_LAK: 23100,
}

function isRatePair(value: string): value is RatePair {
  return (RATE_PAIRS as readonly string[]).includes(value)
}

/**
 * Fetch the current USD exchange rates, keyed by pair. Falls back to
 * DEFAULT_RATES for any pair that is missing or if the table is unavailable.
 */
export async function getRates(
  supabase: SupabaseClient
): Promise<Record<RatePair, RateRecord>> {
  const result = {} as Record<RatePair, RateRecord>
  for (const pair of RATE_PAIRS) {
    result[pair] = { pair, rate: DEFAULT_RATES[pair], updated_at: null }
  }

  const { data } = await supabase.from('exchange_rates').select('pair, rate, updated_at')
  for (const row of (data ?? []) as { pair: string; rate: number | string; updated_at: string | null }[]) {
    if (isRatePair(row.pair) && row.rate != null) {
      result[row.pair] = {
        pair: row.pair,
        rate: Number(row.rate),
        updated_at: row.updated_at,
      }
    }
  }

  return result
}
