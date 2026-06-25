import type { SupabaseClient } from '@supabase/supabase-js'
import type { SalesRep } from './types'

export const CUSTOMERS_PAGE_SIZE = 25

export function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

export async function getSalesReps(supabase: SupabaseClient): Promise<SalesRep[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .in('role', ['admin', 'manager', 'sales'])
    .order('full_name')
  return (data ?? []) as SalesRep[]
}
