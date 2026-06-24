import { createClient } from '@/lib/supabase/server'

function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((s, v) => s + v, 0) / values.length
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes.toFixed(0)} นาที`
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return `${hours} ชม. ${mins} นาที`
}

export default async function AdminDeliveryReportsPage() {
  const supabase = await createClient()

  const [{ data: bookings }, { data: receivings }] = await Promise.all([
    supabase.from('cherry_bookings').select('arrived_at, weighing_started_at').not('arrived_at', 'is', null).not('weighing_started_at', 'is', null),
    supabase.from('cherry_receivings').select('accepted_weight, received_at'),
  ])

  const waitMinutes = (bookings ?? [])
    .map((b) => {
      const arrived = new Date(b.arrived_at as string).getTime()
      const weighing = new Date(b.weighing_started_at as string).getTime()
      return (weighing - arrived) / 60000
    })
    .filter((m) => Number.isFinite(m) && m >= 0)

  const avgWaitMinutes = average(waitMinutes)

  const kgByHour = new Map<number, number>()
  for (const r of receivings ?? []) {
    if (!r.received_at) continue
    const hour = new Date(r.received_at).getHours()
    kgByHour.set(hour, (kgByHour.get(hour) ?? 0) + Number(r.accepted_weight ?? 0))
  }

  const hourlyRows = Array.from({ length: 24 }, (_, hour) => ({ hour, kg: kgByHour.get(hour) ?? 0 })).filter((r) => r.kg > 0)

  const totalKg = hourlyRows.reduce((s, r) => s + r.kg, 0)
  const peakHours = [...hourlyRows].sort((a, b) => b.kg - a.kg).slice(0, 3)

  return (
    <div>
      <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>รายงานคิวรับเชอร์รี่</h1>
      <p style={{ color: '#6b8f5e', marginBottom: 20 }}>เวลารอเฉลี่ย ปริมาณรับซื้อต่อชั่วโมง และช่วงเวลาที่มีปริมาณสูงสุด</p>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 24 }}>
        <ReportCard label="เวลารอเฉลี่ย (มาถึง → ชั่งน้ำหนัก)" value={waitMinutes.length === 0 ? '-' : formatMinutes(avgWaitMinutes)} />
        <ReportCard label="ปริมาณรับซื้อรวมทั้งหมด" value={`${totalKg.toLocaleString()} กก.`} />
        <ReportCard label="จำนวนคิวที่มีข้อมูลเวลารอ" value={String(waitMinutes.length)} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h2 style={{ fontSize: 16, color: '#2d4a3a' }}>ปริมาณรับซื้อต่อชั่วโมง</h2>
      </div>

      {hourlyRows.length === 0 ? (
        <p style={{ color: '#999', marginBottom: 24 }}>ยังไม่มีข้อมูลการรับซื้อ</p>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f7f2', textAlign: 'left' }}>
                <th style={th}>ชั่วโมง</th>
                <th style={th}>ปริมาณ (กก.)</th>
                <th style={th}>สัดส่วน</th>
              </tr>
            </thead>
            <tbody>
              {hourlyRows.map((r) => (
                <tr key={r.hour} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>{String(r.hour).padStart(2, '0')}:00 - {String(r.hour + 1).padStart(2, '0')}:00</td>
                  <td style={td}>{r.kg.toLocaleString()}</td>
                  <td style={td}>{totalKg > 0 ? `${((r.kg / totalKg) * 100).toFixed(1)}%` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={{ fontSize: 16, color: '#2d4a3a', marginBottom: 10 }}>ช่วงเวลาที่มีปริมาณสูงสุด</h2>
      {peakHours.length === 0 ? (
        <p style={{ color: '#999' }}>ยังไม่มีข้อมูล</p>
      ) : (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {peakHours.map((r, i) => (
            <div key={r.hour} style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', minWidth: 160 }}>
              <div style={{ fontSize: 12, color: '#6b8f5e', marginBottom: 4 }}>อันดับ {i + 1}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#2d4a3a' }}>
                {String(r.hour).padStart(2, '0')}:00 - {String(r.hour + 1).padStart(2, '0')}:00
              </div>
              <div style={{ fontSize: 13, color: '#444' }}>{r.kg.toLocaleString()} กก.</div>
            </div>
          ))}
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
