import type { SupabaseClient } from '@supabase/supabase-js'
import type { DeliverySlot, SlotAvailability } from './types'

export async function getActiveDeliverySlots(supabase: SupabaseClient): Promise<DeliverySlot[]> {
  const { data } = await supabase
    .from('delivery_slots')
    .select('id, start_time, end_time, capacity_kg, active, created_at')
    .eq('active', true)
    .order('start_time', { ascending: true })

  return (data ?? []) as DeliverySlot[]
}

export async function getSlotAvailability(supabase: SupabaseClient, date: string): Promise<SlotAvailability[]> {
  const { data } = await supabase.rpc('delivery_slot_availability', { p_date: date })

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    slot_id: String(row.slot_id),
    start_time: String(row.start_time),
    end_time: String(row.end_time),
    capacity_kg: Number(row.capacity_kg),
    booked_kg: Number(row.booked_kg),
    remaining_kg: Number(row.remaining_kg),
  }))
}
