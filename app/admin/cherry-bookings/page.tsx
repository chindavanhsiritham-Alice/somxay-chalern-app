import { createClient } from '@/lib/supabase/server'
import CherryBookingsManager, { type AdminBookingRow } from './CherryBookingsManager'

export default async function AdminCherryBookingsPage() {
  const supabase = await createClient()

  const { data: bookings } = await supabase
    .from('cherry_bookings')
    .select('*, farmers(full_name, phone, village, farmer_debts(*)), cherry_receivings(*), farmer_payments(*)')
    .order('created_at', { ascending: false })
    .limit(200)

  return <CherryBookingsManager initialBookings={(bookings ?? []) as unknown as AdminBookingRow[]} />
}
