import type { SupabaseClient } from '@supabase/supabase-js'
import type { Farmer } from './types'

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
