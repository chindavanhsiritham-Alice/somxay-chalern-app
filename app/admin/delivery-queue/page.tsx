import { createClient } from '@/lib/supabase/server'
import DeliveryQueueManager, { type AdminQueueBookingRow } from './DeliveryQueueManager'
import type { DeliverySlot } from '@/lib/farmer/types'

function todayDateString() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10)
}

export default async function AdminDeliveryQueuePage() {
  const supabase = await createClient()
  const today = todayDateString()

  const [{ data: slots }, { data: bookings }] = await Promise.all([
    supabase.from('delivery_slots').select('id, start_time, end_time, capacity_kg, active, created_at').order('start_time'),
    supabase
      .from('cherry_bookings')
      .select(
        'id, booking_code, queue_number, estimated_quantity, quantity_unit, coffee_type, delivery_point, status, arrival_status, slot_id, arrived_at, weighing_started_at, quality_check_started_at, completed_at, farmers(full_name, phone, village)'
      )
      .eq('delivery_date', today)
      .order('queue_number', { ascending: true }),
  ])

  return (
    <DeliveryQueueManager
      today={today}
      initialSlots={(slots ?? []) as DeliverySlot[]}
      initialBookings={(bookings ?? []) as unknown as AdminQueueBookingRow[]}
    />
  )
}
