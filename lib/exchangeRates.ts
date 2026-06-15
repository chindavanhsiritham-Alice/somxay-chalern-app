import type { SupabaseClient } from '@supabase/supabase-js'

// The exchange_rates table schema may vary slightly across environments, so we
// read fields defensively rather than assuming a single fixed column layout.
export type RateRow = Record<string, unknown>

export interface ParsedRate {
  /** ISO currency code, e.g. "LAK", "THB". */
  code?: string
  /** Units of `code` per 1 USD. */
  rate?: number
  /** Effective/updated date as an ISO string, when available. */
  date?: string
}

function firstString(row: RateRow, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row[k]
    if (typeof v === 'string' && v.trim()) return v
  }
  return undefined
}

function firstNumber(row: RateRow, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = row[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v)
  }
  return undefined
}

export function readRate(row: RateRow): ParsedRate {
  return {
    code: firstString(row, ['currency_code', 'code', 'currency', 'currency_to']),
    rate: firstNumber(row, ['rate_per_usd', 'rate', 'usd_rate', 'value', 'rate_to_usd']),
    date: firstString(row, ['as_of_date', 'effective_date', 'rate_date', 'updated_at', 'created_at']),
  }
}

/**
 * Fetch exchange-rate rows from Supabase. Returns the most recent row per
 * currency (when a date field exists) so callers see current rates. Returns an
 * empty array if the table is missing or the query fails.
 */
export async function getLatestRates(supabase: SupabaseClient): Promise<RateRow[]> {
  const { data, error } = await supabase.from('exchange_rates').select('*')
  if (error || !data) return []

  // Keep the newest entry for each currency code.
  const latest = new Map<string, { row: RateRow; date: string }>()
  const undated: RateRow[] = []

  for (const row of data as RateRow[]) {
    const { code, date } = readRate(row)
    if (!code) {
      undated.push(row)
      continue
    }
    const key = code.toUpperCase()
    const existing = latest.get(key)
    if (!existing || (date && date > existing.date)) {
      latest.set(key, { row, date: date ?? '' })
    }
  }

  const deduped = Array.from(latest.values()).map((e) => e.row)
  const result = deduped.length > 0 ? deduped : undated
  return result.sort((a, b) =>
    (readRate(a).code ?? '').localeCompare(readRate(b).code ?? '')
  )
}
