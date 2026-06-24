import type { SupabaseClient } from '@supabase/supabase-js'
import type { Farmer, FarmerDebtBalance } from './types'

/**
 * Look up the farmers row for the signed-in profile, creating it on first
 * visit since there is no separate farmer-registration step — the profile
 * already has role='farmer' by the time it reaches /farmer/*.
 */
export async function getOrCreateFarmer(
  supabase: SupabaseClient,
  profileId: string,
  fallbackName: string
): Promise<Farmer> {
  const { data: existing } = await supabase
    .from('farmers')
    .select('id, profile_id, full_name, phone, village')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (existing) return existing as Farmer

  const { data: created } = await supabase
    .from('farmers')
    .insert({ profile_id: profileId, full_name: fallbackName })
    .select('id, profile_id, full_name, phone, village')
    .single()

  return created as Farmer
}

/**
 * Read a farmer's category debt balances, defaulting every field to 0 when
 * no farmer_debts row exists yet (rows are created lazily on first write).
 */
export async function getFarmerDebtBalance(supabase: SupabaseClient, farmerId: string): Promise<FarmerDebtBalance> {
  const { data } = await supabase
    .from('farmer_debts')
    .select('farmer_id, balance, fertilizer_balance, pesticide_balance, cash_advance_balance, other_balance, updated_at')
    .eq('farmer_id', farmerId)
    .maybeSingle()

  return {
    farmer_id: farmerId,
    balance: Number(data?.balance ?? 0),
    fertilizer_balance: Number(data?.fertilizer_balance ?? 0),
    pesticide_balance: Number(data?.pesticide_balance ?? 0),
    cash_advance_balance: Number(data?.cash_advance_balance ?? 0),
    other_balance: Number(data?.other_balance ?? 0),
    updated_at: data?.updated_at ?? new Date(0).toISOString(),
  }
}
