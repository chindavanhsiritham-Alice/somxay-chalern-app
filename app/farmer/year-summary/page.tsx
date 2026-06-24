import { createClient } from '@/lib/supabase/server'
import { getOrCreateFarmer } from '@/lib/farmer/farmer'
import { farmerTheme } from '@/lib/farmer/theme'

const MONTH_LABELS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

export default async function FarmerYearSummaryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user!.id).maybeSingle()
  const farmer = await getOrCreateFarmer(supabase, user!.id, profile?.full_name ?? 'เกษตรกร')

  const year = new Date().getFullYear()
  const startOfYear = new Date(year, 0, 1).toISOString()

  const [{ data: receivings }, { data: payments }] = await Promise.all([
    supabase
      .from('cherry_receivings')
      .select('accepted_weight, received_at, cherry_bookings!inner(farmer_id)')
      .eq('cherry_bookings.farmer_id', farmer.id)
      .gte('received_at', startOfYear),
    supabase
      .from('farmer_payments')
      .select('gross_amount, net_payable, status, created_at')
      .eq('farmer_id', farmer.id)
      .gte('created_at', startOfYear),
  ])

  const totalVolume = (receivings ?? []).reduce((sum, r) => sum + Number(r.accepted_weight ?? 0), 0)
  const totalSalesValue = (payments ?? []).reduce((sum, p) => sum + Number(p.gross_amount), 0)
  const remainingUnpaid = (payments ?? [])
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + Number(p.net_payable), 0)

  const monthly = Array.from({ length: 12 }, (_, i) => ({ month: i, volume: 0, value: 0 }))
  for (const r of receivings ?? []) {
    if (!r.received_at) continue
    const m = new Date(r.received_at).getMonth()
    monthly[m].volume += Number(r.accepted_weight ?? 0)
  }
  for (const p of payments ?? []) {
    const m = new Date(p.created_at).getMonth()
    monthly[m].value += Number(p.gross_amount)
  }

  return (
    <div>
      <h1 style={{ color: farmerTheme.greenDark, fontSize: 20, marginBottom: 4 }}>สรุปรายปี {year}</h1>
      <p style={{ color: farmerTheme.muted, fontSize: 13, marginBottom: 18 }}>ปริมาณเชอร์รี่ มูลค่าขาย และยอดคงเหลือที่ยังไม่ได้รับเงินในปีนี้</p>

      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr', marginBottom: 18 }}>
        <Card>
          <div style={{ fontSize: 12, color: farmerTheme.muted, marginBottom: 4 }}>ปริมาณเชอร์รี่รวมทั้งปี</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: farmerTheme.green }}>{totalVolume.toLocaleString()} กก.</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: farmerTheme.muted, marginBottom: 4 }}>มูลค่าขายเชอร์รี่รวมทั้งปี</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: farmerTheme.green }}>{totalSalesValue.toLocaleString()} บาท</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: farmerTheme.muted, marginBottom: 4 }}>ยอดคงเหลือที่ยังไม่ได้รับเงิน</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: remainingUnpaid > 0 ? '#8a5a00' : farmerTheme.green }}>
            {remainingUnpaid.toLocaleString()} บาท
          </div>
        </Card>
      </div>

      <h2 style={{ fontSize: 14, color: farmerTheme.greenDark, marginBottom: 8 }}>รายละเอียดตามเดือน</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {monthly.map((m) => (
          <div
            key={m.month}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              background: farmerTheme.card,
              border: `1px solid ${farmerTheme.border}`,
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 13,
            }}
          >
            <span style={{ color: farmerTheme.text, fontWeight: 600 }}>{MONTH_LABELS_TH[m.month]}</span>
            <span style={{ color: farmerTheme.muted }}>
              {m.volume.toLocaleString()} กก. · {m.value.toLocaleString()} บาท
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: farmerTheme.card, border: `1px solid ${farmerTheme.border}`, borderRadius: 12, padding: 14 }}>
      {children}
    </div>
  )
}
