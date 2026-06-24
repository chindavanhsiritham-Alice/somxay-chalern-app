import { createClient } from '@/lib/supabase/server'
import ExportCsvButton, { type FarmerYearRow } from './ExportCsvButton'

function toOne<T>(v: T[] | T | null | undefined): T | null {
  if (v == null) return null
  return Array.isArray(v) ? v[0] ?? null : v
}

export default async function AdminFarmerYearSummaryPage() {
  const supabase = await createClient()
  const year = new Date().getFullYear()
  const startOfYear = new Date(year, 0, 1).toISOString()

  const [{ data: farmers }, { data: debts }, { data: paymentsThisYear }, { data: receivingsThisYear }, { data: allPayments }] = await Promise.all([
    supabase.from('farmers').select('id, full_name, village'),
    supabase.from('farmer_debts').select('farmer_id, fertilizer_balance, pesticide_balance, cash_advance_balance, other_balance'),
    supabase.from('farmer_payments').select('farmer_id, gross_amount, created_at').gte('created_at', startOfYear),
    supabase
      .from('cherry_receivings')
      .select('accepted_weight, received_at, cherry_bookings!inner(farmer_id)')
      .gte('received_at', startOfYear),
    supabase.from('farmer_payments').select('fertilizer_deduction, pesticide_deduction, cash_advance_deduction'),
  ])

  const totalFertilizerDebt = (debts ?? []).reduce((s, d) => s + Number(d.fertilizer_balance), 0)
  const totalPesticideDebt = (debts ?? []).reduce((s, d) => s + Number(d.pesticide_balance), 0)
  const totalCashAdvance = (debts ?? []).reduce((s, d) => s + Number(d.cash_advance_balance), 0)
  const totalOtherDebt = (debts ?? []).reduce((s, d) => s + Number(d.other_balance), 0)
  const totalOutstanding = totalFertilizerDebt + totalPesticideDebt + totalCashAdvance + totalOtherDebt

  const totalDeducted = (allPayments ?? []).reduce(
    (s, p) => s + Number(p.fertilizer_deduction) + Number(p.pesticide_deduction) + Number(p.cash_advance_deduction),
    0
  )

  const farmerMap = new Map((farmers ?? []).map((f) => [f.id, f]))
  const perFarmer = new Map<string, { volume: number; value: number }>()

  for (const r of receivingsThisYear ?? []) {
    const booking = toOne(r.cherry_bookings as { farmer_id: string }[] | { farmer_id: string } | null)
    if (!booking) continue
    const entry = perFarmer.get(booking.farmer_id) ?? { volume: 0, value: 0 }
    entry.volume += Number(r.accepted_weight ?? 0)
    perFarmer.set(booking.farmer_id, entry)
  }
  for (const p of paymentsThisYear ?? []) {
    const entry = perFarmer.get(p.farmer_id) ?? { volume: 0, value: 0 }
    entry.value += Number(p.gross_amount)
    perFarmer.set(p.farmer_id, entry)
  }

  const totalCherryVolumeThisYear = Array.from(perFarmer.values()).reduce((s, e) => s + e.volume, 0)

  const fullList: FarmerYearRow[] = Array.from(perFarmer.entries())
    .map(([farmerId, { volume, value }]) => ({
      farmerId,
      name: farmerMap.get(farmerId)?.full_name ?? 'ไม่ทราบชื่อ',
      village: farmerMap.get(farmerId)?.village ?? '-',
      volume,
      value,
    }))
    .sort((a, b) => b.volume - a.volume)

  const top20 = fullList.slice(0, 20)

  return (
    <div>
      <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>Farmer Year Summary</h1>
      <p style={{ color: '#6b8f5e', marginBottom: 20 }}>สรุปหนี้คงเหลือและยอดซื้อเชอร์รี่รายปี {year}</p>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 24 }}>
        <ReportCard label="ยอดหนี้คงเหลือทั้งหมด" value={`${totalOutstanding.toLocaleString()} บาท`} />
        <ReportCard label="หนี้ค่าปุ๋ยทั้งหมด" value={`${totalFertilizerDebt.toLocaleString()} บาท`} />
        <ReportCard label="หนี้ค่ายา/สารเคมีทั้งหมด" value={`${totalPesticideDebt.toLocaleString()} บาท`} />
        <ReportCard label="เงินเบิกล่วงหน้าทั้งหมด" value={`${totalCashAdvance.toLocaleString()} บาท`} />
        <ReportCard label="หักจากการจ่ายเงินค่าเชอร์รี่ทั้งหมด" value={`${totalDeducted.toLocaleString()} บาท`} />
        <ReportCard label="ปริมาณเชอร์รี่ที่รับซื้อปีนี้" value={`${totalCherryVolumeThisYear.toLocaleString()} กก.`} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h2 style={{ fontSize: 16, color: '#2d4a3a' }}>20 อันดับเกษตรกรซื้อเชอร์รี่มากที่สุด (ปีนี้)</h2>
        <ExportCsvButton rows={fullList} year={year} />
      </div>

      {top20.length === 0 ? (
        <p style={{ color: '#999' }}>ยังไม่มีข้อมูลในปีนี้</p>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f7f2', textAlign: 'left' }}>
                <th style={th}>#</th>
                <th style={th}>เกษตรกร</th>
                <th style={th}>หมู่บ้าน</th>
                <th style={th}>ปริมาณ (กก.)</th>
                <th style={th}>มูลค่าขาย (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {top20.map((r, i) => (
                <tr key={r.farmerId} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>{i + 1}</td>
                  <td style={td}>{r.name}</td>
                  <td style={td}>{r.village}</td>
                  <td style={td}>{r.volume.toLocaleString()}</td>
                  <td style={td}>{r.value.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const th: React.CSSProperties = { padding: '10px 14px', fontWeight: 600, color: '#2d4a3a' }
const td: React.CSSProperties = { padding: '10px 14px', color: '#444' }

function ReportCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 12, color: '#6b8f5e', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#2d4a3a' }}>{value}</div>
    </div>
  )
}
