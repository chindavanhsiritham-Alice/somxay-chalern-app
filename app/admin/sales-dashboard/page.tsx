import { createClient } from '@/lib/supabase/server'
import { getSalesReps } from '@/lib/crm/data'
import { monthStartIso, todayDateString } from '@/lib/sales/data'
import { followUpDisplayStatus } from '@/lib/sales/types'

const th: React.CSSProperties = { padding: '10px 14px', fontWeight: 600, color: '#2d4a3a' }
const td: React.CSSProperties = { padding: '10px 14px', color: '#444' }
const tableWrap: React.CSSProperties = { background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 24 }

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)
}

export default async function SalesDashboardPage() {
  const supabase = await createClient()

  const monthStart = monthStartIso()
  const today = todayDateString()

  const [salesReps, { data: quotations }, { data: followups }] = await Promise.all([
    getSalesReps(supabase),
    supabase
      .from('quotations')
      .select('id, customer_id, sales_rep_id, status, approval_status, total, currency, created_at'),
    supabase.from('sales_followups').select('id, customer_id, sales_rep_id, due_date, status'),
  ])

  const allQuotations = quotations ?? []
  const allFollowups = followups ?? []

  const thisMonthQuotations = allQuotations.filter((q) => q.created_at && q.created_at >= monthStart)
  const acceptedQuotations = allQuotations.filter((q) => q.status === 'accepted')
  const rejectedQuotations = allQuotations.filter((q) => q.status === 'rejected')
  const convertedQuotations = allQuotations.filter((q) => q.status === 'converted')

  const pipelineValue = allQuotations
    .filter((q) => q.status !== 'rejected' && q.status !== 'expired' && q.status !== 'converted')
    .reduce((sum, q) => sum + (q.total ?? 0), 0)

  const followUpsDueToday = allFollowups.filter((f) => f.status === 'open' && f.due_date === today)
  const overdueFollowUps = allFollowups.filter((f) => followUpDisplayStatus(f) === 'overdue')

  const stats = [
    { label: 'ใบเสนอราคาเดือนนี้', value: thisMonthQuotations.length.toLocaleString() },
    { label: 'ลูกค้ายอมรับ', value: acceptedQuotations.length.toLocaleString() },
    { label: 'ถูกปฏิเสธ', value: rejectedQuotations.length.toLocaleString() },
    { label: 'แปลงเป็นออเดอร์แล้ว', value: convertedQuotations.length.toLocaleString() },
    { label: 'ติดตามวันนี้', value: followUpsDueToday.length.toLocaleString() },
    { label: 'เกินกำหนดติดตาม', value: overdueFollowUps.length.toLocaleString() },
    { label: 'มูลค่าไปป์ไลน์', value: formatMoney(pipelineValue) },
  ]

  const repById = new Map(salesReps.map((r) => [r.id, r]))

  type RepAgg = { count: number; total: number; accepted: number; converted: number }
  const byRep = new Map<string, RepAgg>()
  for (const q of allQuotations) {
    const key = q.sales_rep_id ?? 'unassigned'
    const agg = byRep.get(key) ?? { count: 0, total: 0, accepted: 0, converted: 0 }
    agg.count += 1
    agg.total += q.total ?? 0
    if (q.status === 'accepted') agg.accepted += 1
    if (q.status === 'converted') agg.converted += 1
    byRep.set(key, agg)
  }
  const repRows = Array.from(byRep.entries())
    .map(([repId, agg]) => ({
      label: repId === 'unassigned' ? 'ไม่ระบุเซลส์' : repById.get(repId)?.full_name ?? repId,
      ...agg,
    }))
    .sort((a, b) => b.total - a.total)

  type CustomerAgg = { count: number; total: number }
  const byCustomer = new Map<string, CustomerAgg>()
  for (const q of allQuotations) {
    if (!q.customer_id) continue
    const agg = byCustomer.get(q.customer_id) ?? { count: 0, total: 0 }
    agg.count += 1
    agg.total += q.total ?? 0
    byCustomer.set(q.customer_id, agg)
  }
  const topCustomerIds = Array.from(byCustomer.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([id]) => id)

  const { data: topCustomersData } =
    topCustomerIds.length > 0
      ? await supabase
          .from('customers')
          .select('id, customer_code, company_name, shop_name')
          .in('id', topCustomerIds)
      : { data: [] as { id: string; customer_code: string | null; company_name: string | null; shop_name: string | null }[] }

  const customerById = new Map((topCustomersData ?? []).map((c) => [c.id, c]))
  const topCustomerRows = topCustomerIds
    .map((id) => ({ customer: customerById.get(id), ...(byCustomer.get(id) as CustomerAgg) }))
    .filter((r) => r.customer)

  return (
    <div>
      <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>Sales Dashboard</h1>
      <p style={{ color: '#6b8f5e', marginBottom: 24 }}>สรุปภาพรวมงานขายและใบเสนอราคา</p>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 32 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: 12, color: '#6b8f5e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</p>
            <p style={{ fontSize: 26, fontWeight: 700, color: '#2d4a3a', margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 16, color: '#2d4a3a', marginBottom: 10 }}>ยอดขายตามเซลส์</h2>
      {repRows.length === 0 ? (
        <p style={{ color: '#999', marginBottom: 24 }}>ยังไม่มีใบเสนอราคา</p>
      ) : (
        <div style={tableWrap}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f7f2', textAlign: 'left' }}>
                <th style={th}>เซลส์</th>
                <th style={th}>ใบเสนอราคา</th>
                <th style={th}>ยอมรับแล้ว</th>
                <th style={th}>แปลงเป็นออเดอร์</th>
                <th style={th}>มูลค่ารวม</th>
              </tr>
            </thead>
            <tbody>
              {repRows.map((r) => (
                <tr key={r.label} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>{r.label}</td>
                  <td style={td}>{r.count.toLocaleString()}</td>
                  <td style={td}>{r.accepted.toLocaleString()}</td>
                  <td style={td}>{r.converted.toLocaleString()}</td>
                  <td style={{ ...td, fontWeight: 600, color: '#2d7a3a' }}>{formatMoney(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={{ fontSize: 16, color: '#2d4a3a', marginBottom: 10 }}>ลูกค้าชั้นนำ (ตามมูลค่าใบเสนอราคา)</h2>
      {topCustomerRows.length === 0 ? (
        <p style={{ color: '#999', marginBottom: 24 }}>ยังไม่มีข้อมูล</p>
      ) : (
        <div style={tableWrap}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f7f2', textAlign: 'left' }}>
                <th style={th}>รหัสลูกค้า</th>
                <th style={th}>บริษัท / ร้าน</th>
                <th style={th}>จำนวนใบเสนอราคา</th>
                <th style={th}>มูลค่ารวม</th>
              </tr>
            </thead>
            <tbody>
              {topCustomerRows.map((r) => (
                <tr key={r.customer!.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>{r.customer!.customer_code ?? '-'}</td>
                  <td style={td}>{r.customer!.company_name ?? r.customer!.shop_name ?? '-'}</td>
                  <td style={td}>{r.count.toLocaleString()}</td>
                  <td style={{ ...td, fontWeight: 600, color: '#2d7a3a' }}>{formatMoney(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
