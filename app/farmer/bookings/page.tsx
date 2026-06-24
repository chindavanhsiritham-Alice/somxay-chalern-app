import { createClient } from '@/lib/supabase/server'
import { getOrCreateFarmer } from '@/lib/farmer/farmer'
import { farmerTheme } from '@/lib/farmer/theme'
import {
  ARRIVAL_STATUS_LABELS,
  BOOKING_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  type ArrivalStatus,
  type BookingStatus,
  type PaymentStatus,
} from '@/lib/farmer/types'

export default async function FarmerBookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user!.id).maybeSingle()
  const farmer = await getOrCreateFarmer(supabase, user!.id, profile?.full_name ?? 'เกษตรกร')

  const [{ data: bookings }, { data: payments }] = await Promise.all([
    supabase
      .from('cherry_bookings')
      .select('id, booking_code, coffee_type, estimated_quantity, quantity_unit, delivery_date, status, queue_number, arrival_status')
      .eq('farmer_id', farmer.id)
      .order('created_at', { ascending: false }),
    supabase.from('farmer_payments').select('booking_id, status').eq('farmer_id', farmer.id),
  ])

  const paymentStatusByBooking = new Map<string, PaymentStatus>()
  for (const p of payments ?? []) {
    if (p.booking_id) paymentStatusByBooking.set(p.booking_id, p.status as PaymentStatus)
  }

  return (
    <div>
      <h1 style={{ color: farmerTheme.greenDark, fontSize: 20, marginBottom: 16 }}>ประวัติการขายเชอร์รี่</h1>

      {!bookings || bookings.length === 0 ? (
        <p style={{ color: farmerTheme.muted, fontSize: 13 }}>ยังไม่มีรายการขาย</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bookings.map((b) => {
            const paymentStatus = paymentStatusByBooking.get(b.id)
            return (
              <div key={b.id} style={{ background: farmerTheme.card, border: `1px solid ${farmerTheme.border}`, borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{b.booking_code}</span>
                  <Badge label={BOOKING_STATUS_LABELS[b.status as BookingStatus]} status={b.status as BookingStatus} />
                </div>
                {b.queue_number && (
                  <div style={{ fontSize: 13, color: farmerTheme.green, fontWeight: 700, marginTop: 6 }}>
                    {b.queue_number} · {ARRIVAL_STATUS_LABELS[(b.arrival_status as ArrivalStatus) ?? 'waiting']}
                  </div>
                )}
                <div style={{ fontSize: 13, color: farmerTheme.text, marginTop: 6 }}>
                  {b.coffee_type} · {b.estimated_quantity} {b.quantity_unit}
                </div>
                <div style={{ fontSize: 12, color: farmerTheme.muted, marginTop: 4 }}>
                  วันส่งสินค้า: {b.delivery_date}
                </div>
                <div style={{ fontSize: 12, color: farmerTheme.muted, marginTop: 2 }}>
                  สถานะการจ่ายเงิน: {paymentStatus ? PAYMENT_STATUS_LABELS[paymentStatus] : 'ยังไม่มีข้อมูล'}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const STATUS_COLORS: Record<BookingStatus, { bg: string; fg: string }> = {
  pending: { bg: '#fbe6c8', fg: '#8a5a00' },
  confirmed: { bg: '#d6e8ff', fg: '#1a4f8a' },
  received: { bg: '#d4f0d4', fg: '#256029' },
  cancelled: { bg: '#f5d6d6', fg: '#9a2a2a' },
}

function Badge({ label, status }: { label: string; status: BookingStatus }) {
  const c = STATUS_COLORS[status]
  return <span style={{ background: c.bg, color: c.fg, fontSize: 11, padding: '2px 8px', borderRadius: 999 }}>{label}</span>
}
