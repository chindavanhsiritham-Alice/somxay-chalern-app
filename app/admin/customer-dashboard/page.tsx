import { createClient } from '@/lib/supabase/server'
import { daysAgoIso } from '@/lib/crm/data'
import { CUSTOMER_CATEGORY_LABELS, type CustomerCategory } from '@/lib/crm/types'

const th: React.CSSProperties = { padding: '10px 14px', fontWeight: 600, color: '#2d4a3a' }
const td: React.CSSProperties = { padding: '10px 14px', color: '#444' }
const tableWrap: React.CSSProperties = { background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 24 }

function formatUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default async function CustomerDashboardPage() {
  const supabase = await createClient()

  const thirtyDaysAgo = daysAgoIso(30)

  const [{ data: customers }, { data: orders }] = await Promise.all([
    supabase
      .from('customers')
      .select('id, customer_code, company_name, shop_name, owner_name, province, category, status, created_at'),
    supabase.from('orders').select('id, customer_id, order_date, status, total_usd'),
  ])

  const allCustomers = customers ?? []
  const allOrders = orders ?? []

  const totalCustomers = allCustomers.length
  const activeCustomers = allCustomers.filter((c) => c.status === 'active').length
  const newCustomers = allCustomers.filter((c) => c.created_at && c.created_at >= thirtyDaysAgo).length
  const pendingApproval = allCustomers.filter((c) => c.status === 'pending').length

  const stats = [
    { label: 'ลูกค้าทั้งหมด', value: totalCustomers.toLocaleString() },
    { label: 'ลูกค้าที่ใช้งานอยู่', value: activeCustomers.toLocaleString() },
    { label: 'ลูกค้าใหม่ (30 วัน)', value: newCustomers.toLocaleString() },
    { label: 'รออนุมัติ', value: pendingApproval.toLocaleString() },
  ]

  const byProvince = new Map<string, number>()
  const byCategory = new Map<string, number>()
  for (const c of allCustomers) {
    const province = c.province || 'ไม่ระบุ'
    byProvince.set(province, (byProvince.get(province) ?? 0) + 1)
    const category = c.category || 'ไม่ระบุ'
    byCategory.set(category, (byCategory.get(category) ?? 0) + 1)
  }
  const provinceRows = Array.from(byProvince.entries()).sort((a, b) => b[1] - a[1])
  const categoryRows = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1])

  type Agg = { totalValue: number; orderCount: number; lastPurchase: string | null }
  const byCustomer = new Map<string, Agg>()
  for (const o of allOrders) {
    if (!o.customer_id) continue
    const agg = byCustomer.get(o.customer_id) ?? { totalValue: 0, orderCount: 0, lastPurchase: null }
    agg.totalValue += o.total_usd ?? 0
    agg.orderCount += 1
    if (!agg.lastPurchase || (o.order_date && o.order_date > agg.lastPurchase)) agg.lastPurchase = o.order_date
    byCustomer.set(o.customer_id, agg)
  }

  const customerById = new Map(allCustomers.map((c) => [c.id, c]))
  const topCustomers = Array.from(byCustomer.entries())
    .map(([customerId, agg]) => ({ customer: customerById.get(customerId), ...agg }))
    .filter((r) => r.customer)
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 10)

  const outstandingOrders = allOrders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled')

  return (
    <div>
      <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>Customer Dashboard</h1>
      <p style={{ color: '#6b8f5e', marginBottom: 24 }}>สรุปภาพรวมฐานลูกค้าและยอดขาย</p>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 32 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: 12, color: '#6b8f5e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#2d4a3a', margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 16, color: '#2d4a3a', marginBottom: 10 }}>ลูกค้าชั้นนำ (ตามยอดขาย)</h2>
      {topCustomers.length === 0 ? (
        <p style={{ color: '#999', marginBottom: 24 }}>ยังไม่มีคำสั่งซื้อ</p>
      ) : (
        <div style={tableWrap}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f7f2', textAlign: 'left' }}>
                <th style={th}>รหัสลูกค้า</th>
                <th style={th}>บริษัท / ร้าน</th>
                <th style={th}>จำนวนคำสั่งซื้อ</th>
                <th style={th}>ยอดขายรวม</th>
                <th style={th}>ซื้อล่าสุด</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.map((r) => (
                <tr key={r.customer!.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>{r.customer!.customer_code ?? '-'}</td>
                  <td style={td}>{r.customer!.company_name ?? r.customer!.shop_name ?? '-'}</td>
                  <td style={td}>{r.orderCount.toLocaleString()}</td>
                  <td style={{ ...td, fontWeight: 600, color: '#2d7a3a' }}>{formatUSD(r.totalValue)}</td>
                  <td style={td}>{r.lastPurchase ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <div>
          <h2 style={{ fontSize: 16, color: '#2d4a3a', marginBottom: 10 }}>ลูกค้าตามจังหวัด</h2>
          {provinceRows.length === 0 ? (
            <p style={{ color: '#999' }}>ยังไม่มีข้อมูล</p>
          ) : (
            <div style={tableWrap}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  {provinceRows.map(([province, n]) => (
                    <tr key={province} style={{ borderTop: '1px solid #eee' }}>
                      <td style={td}>{province}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{n.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h2 style={{ fontSize: 16, color: '#2d4a3a', marginBottom: 10 }}>ลูกค้าตามประเภท</h2>
          {categoryRows.length === 0 ? (
            <p style={{ color: '#999' }}>ยังไม่มีข้อมูล</p>
          ) : (
            <div style={tableWrap}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  {categoryRows.map(([category, n]) => (
                    <tr key={category} style={{ borderTop: '1px solid #eee' }}>
                      <td style={td}>
                        {category === 'ไม่ระบุ' ? category : CUSTOMER_CATEGORY_LABELS[category as CustomerCategory]}
                      </td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{n.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <h2 style={{ fontSize: 16, color: '#2d4a3a', margin: '24px 0 10px' }}>
        คำสั่งซื้อค้างดำเนินการ ({outstandingOrders.length.toLocaleString()})
      </h2>
      {outstandingOrders.length === 0 ? (
        <p style={{ color: '#999' }}>ไม่มีคำสั่งซื้อค้างดำเนินการ</p>
      ) : (
        <div style={tableWrap}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f7f2', textAlign: 'left' }}>
                <th style={th}>วันที่</th>
                <th style={th}>ลูกค้า</th>
                <th style={th}>สถานะ</th>
                <th style={th}>มูลค่า</th>
              </tr>
            </thead>
            <tbody>
              {outstandingOrders.slice(0, 20).map((o) => {
                const c = o.customer_id ? customerById.get(o.customer_id) : null
                return (
                  <tr key={o.id} style={{ borderTop: '1px solid #eee' }}>
                    <td style={td}>{o.order_date}</td>
                    <td style={td}>{c?.company_name ?? c?.shop_name ?? '-'}</td>
                    <td style={td}>{o.status}</td>
                    <td style={td}>{formatUSD(o.total_usd ?? 0)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
