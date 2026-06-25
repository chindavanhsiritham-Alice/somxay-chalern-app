import type { SupabaseClient } from '@supabase/supabase-js'
import type { InventoryThreshold, MaterialType, Warehouse } from './types'

export async function getWarehouses(supabase: SupabaseClient): Promise<Warehouse[]> {
  const { data } = await supabase.from('warehouses').select('id, name, location, created_at').order('name')
  return (data ?? []) as Warehouse[]
}

export async function getInventoryThresholds(supabase: SupabaseClient): Promise<Record<MaterialType, number>> {
  const { data } = await supabase.from('inventory_thresholds').select('material_type, threshold_kg')
  const result: Record<MaterialType, number> = {
    cherry: 0,
    parchment: 0,
    green_bean: 0,
    roasted_bean: 0,
    packaging: 0,
    finished_goods: 0,
  }
  for (const row of (data ?? []) as InventoryThreshold[]) {
    result[row.material_type] = Number(row.threshold_kg)
  }
  return result
}

export function todayDateString() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10)
}
