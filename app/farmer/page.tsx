import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateFarmer } from '@/lib/farmer/farmer'
import { getCherryPrices } from '@/lib/farmer/prices'
import { farmerTheme } from '@/lib/farmer/theme'
import { BOOKING_STATUS_LABELS, PAYMENT_STATUS_LABELS, type BookingStatus, type PaymentStatus } from '@/lib/farmer/types'

export default async function FarmerHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user!.id).maybeSingle()
  const farmer = await getOrCreateFarmer(supabase, user!.id, profile?.full_name ?? 'เกษตรกร')
  const prices = await getCherryPrices(supabase)

  const [{ data: pendingBookings }, { data: latestPayments }, { data: debt }] = await Promise.all([
    supabase
      .from('cherry_bookings')
      .select('id, booking_code, coffee_type, estimated_quantity, quantity_unit, delivery_date, status')
      .eq('farmer_id', farmer.id)
      .in('status', ['pending', 'confirmed'])
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('farmer_payments')
      .select('id, net_payable, status, created_at')
      .eq('farmer_id', farmer.id)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.from('farmer_debts').select('balance').eq('farmer_id', farmer.id).maybeSingle(),
  ])

  const debtBalance = Number(debt?.balance ?? 0)

  return (
    <div>
      <h1 style={{ color: farmerTheme.greenDark, fontSize: 20, marginBottom: 4 }}>สวัสดี, {farmer.full_name}</h1>
      <p style={{ color: farmerTheme.muted, fontSize: 13, marginBottom: 18 }}>ราคารับซื้อเชอร์รี่วันนี้</p>

      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr', marginBottom: 18 }}>
        {Object.values(prices).map((p) => (
          <div key={p.coffee_type} style={{ background: farmerTheme.card, border: `1px solid ${farmerTheme.border}`, borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 12, color: farmerTheme.muted, marginBottom: 4 }}>{p.coffee_type}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: farmerTheme.green }}>{p.price_per_kg}</div>
            <div style={{ fontSize: 11, color: farmerTheme.muted }}>บาท/กก.</div>
          </div>
        ))}
      </div>

      <Link
        href="/farmer/sell-cherry"
        style={{
          display: 'block',
          textAlign: 'center',
          background: farmerTheme.green,
          color: '#fff',
          fontWeight: 700,
          fontSize: 16,
          padding: '16px',
          borderRadius: 14,
          textDecoration: 'none',
          marginBottom: 22,
        }}
      >
        🍒 ขายเชอร์รี่
      </Link>

      <Section title="รายการรอดำเนินการ">
        {!pendingBookings || pendingBookings.length === 0 ? (
          <EmptyNote text="ยังไม่มีรายการที่รอดำเนินการ" />
        ) : (
          pendingBookings.map((b) => (
            <Card key={b.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 13 }}>
                <span>{b.booking_code}</span>
                <StatusBadge status={b.status as BookingStatus} />
              </div>
              <div style={{ fontSize: 12, color: farmerTheme.muted, marginTop: 4 }}>
                {b.coffee_type} · {b.estimated_quantity} {b.quantity_unit} · ส่ง {b.delivery_date}
              </div>
            </Card>
          ))
        )}
      </Section>

      <Section title="การจ่ายเงินล่าสุด">
        {!latestPayments || latestPayments.length === 0 ? (
          <EmptyNote text="ยังไม่มีประวัติการจ่ายเงิน" />
        ) : (
          latestPayments.map((p) => (
            <Card key={p.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 13 }}>
                <span>{Number(p.net_payable).toLocaleString()} บาท</span>
                <PaymentBadge status={p.status as PaymentStatus} />
              </div>
              <div style={{ fontSize: 12, color: farmerTheme.muted, marginTop: 4 }}>
                {new Date(p.created_at).toLocaleDateString('th-TH')}
              </div>
            </Card>
          ))
        )}
      </Section>

      <Section title="ยอดหนี้ค่าปุ๋ย">
        <Card>
          <div style={{ fontSize: 22, fontWeight: 700, color: debtBalance > 0 ? '#9a2a2a' : farmerTheme.green }}>
            {debtBalance.toLocaleString()} บาท
          </div>
          <div style={{ fontSize: 12, color: farmerTheme.muted, marginTop: 2 }}>
            {debtBalance > 0 ? 'ยอดที่ต้องหักจากเงินขายเชอร์รี่ครั้งถัดไป' : 'ไม่มีหนี้ค้างชำระ'}
          </div>
        </Card>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h2 style={{ fontSize: 14, color: farmerTheme.greenDark, marginBottom: 8 }}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: farmerTheme.card, border: `1px solid ${farmerTheme.border}`, borderRadius: 12, padding: 12 }}>
      {children}
    </div>
  )
}

function EmptyNote({ text }: { text: string }) {
  return <p style={{ color: farmerTheme.muted, fontSize: 13 }}>{text}</p>
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const colors: Record<BookingStatus, { bg: string; fg: string }> = {
    pending: { bg: '#fbe6c8', fg: '#8a5a00' },
    confirmed: { bg: '#d6e8ff', fg: '#1a4f8a' },
    received: { bg: '#d4f0d4', fg: '#256029' },
    cancelled: { bg: '#f5d6d6', fg: '#9a2a2a' },
  }
  const c = colors[status]
  return (
    <span style={{ background: c.bg, color: c.fg, fontSize: 11, padding: '2px 8px', borderRadius: 999 }}>
      {BOOKING_STATUS_LABELS[status]}
    </span>
  )
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  const colors: Record<PaymentStatus, { bg: string; fg: string }> = {
    pending: { bg: '#fbe6c8', fg: '#8a5a00' },
    paid: { bg: '#d4f0d4', fg: '#256029' },
  }
  const c = colors[status]
  return (
    <span style={{ background: c.bg, color: c.fg, fontSize: 11, padding: '2px 8px', borderRadius: 999 }}>
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  )
}
