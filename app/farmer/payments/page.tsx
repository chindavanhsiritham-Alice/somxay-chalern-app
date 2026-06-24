import { createClient } from '@/lib/supabase/server'
import { getOrCreateFarmer } from '@/lib/farmer/farmer'
import { farmerTheme } from '@/lib/farmer/theme'
import { PAYMENT_STATUS_LABELS, type PaymentStatus } from '@/lib/farmer/types'

export default async function FarmerPaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user!.id).maybeSingle()
  const farmer = await getOrCreateFarmer(supabase, user!.id, profile?.full_name ?? 'เกษตรกร')

  const { data: payments } = await supabase
    .from('farmer_payments')
    .select(
      'id, accepted_weight, price_per_kg, gross_amount, fertilizer_deduction, pesticide_deduction, cash_advance_deduction, net_payable, payment_method, payment_slip_url, status, paid_at, created_at'
    )
    .eq('farmer_id', farmer.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 style={{ color: farmerTheme.greenDark, fontSize: 20, marginBottom: 16 }}>ประวัติการจ่ายเงิน</h1>

      {!payments || payments.length === 0 ? (
        <p style={{ color: farmerTheme.muted, fontSize: 13 }}>ยังไม่มีประวัติการจ่ายเงิน</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {payments.map((p) => (
            <div key={p.id} style={{ background: farmerTheme.card, border: `1px solid ${farmerTheme.border}`, borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 16, color: farmerTheme.green }}>{Number(p.net_payable).toLocaleString()} บาท</span>
                <Badge status={p.status as PaymentStatus} />
              </div>
              <Row label="น้ำหนักที่รับซื้อ" value={`${p.accepted_weight} กก.`} />
              <Row label="ราคา/กก." value={`${p.price_per_kg} บาท`} />
              <Row label="ยอดรวม" value={`${Number(p.gross_amount).toLocaleString()} บาท`} />
              <Row label="หักค่าปุ๋ย" value={`${Number(p.fertilizer_deduction).toLocaleString()} บาท`} />
              {Number(p.pesticide_deduction) > 0 && (
                <Row label="หักค่ายา/สารเคมี" value={`${Number(p.pesticide_deduction).toLocaleString()} บาท`} />
              )}
              {Number(p.cash_advance_deduction) > 0 && (
                <Row label="หักเงินเบิกล่วงหน้า" value={`${Number(p.cash_advance_deduction).toLocaleString()} บาท`} />
              )}
              <Row label="วิธีจ่ายเงิน" value={p.payment_method ?? '-'} />
              {p.payment_slip_url && (
                <a href={p.payment_slip_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: farmerTheme.green }}>
                  ดูสลิปการโอนเงิน
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: farmerTheme.muted, marginTop: 4 }}>
      <span>{label}</span>
      <span style={{ color: farmerTheme.text }}>{value}</span>
    </div>
  )
}

function Badge({ status }: { status: PaymentStatus }) {
  const colors: Record<PaymentStatus, { bg: string; fg: string }> = {
    pending: { bg: '#fbe6c8', fg: '#8a5a00' },
    paid: { bg: '#d4f0d4', fg: '#256029' },
  }
  const c = colors[status]
  return <span style={{ background: c.bg, color: c.fg, fontSize: 11, padding: '2px 8px', borderRadius: 999 }}>{PAYMENT_STATUS_LABELS[status]}</span>
}
