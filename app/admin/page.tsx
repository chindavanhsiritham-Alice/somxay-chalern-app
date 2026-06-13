import { createClient } from '@/lib/supabase/server'

function formatUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default async function AdminHome() {
  const supabase = await createClient()

  const { data: allOrders } = await supabase
    .from('orders')
    .select('id, order_date, status, total_usd, customers(company_name)')
    .order('order_date', { ascending: false })

  const { count: customerCount } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })

  const { data: orderItems } = await supabase
    .from('order_items')
    .select('quantity_kg')

  const orders = (allOrders ?? []).slice(0, 10)
  const totalOrders = allOrders?.length ?? 0
  const totalRevenue = (allOrders ?? []).reduce((sum, o) => sum + (o.total_usd ?? 0), 0)
  const totalVolume = (orderItems ?? []).reduce((sum, i) => sum + (i.quantity_kg ?? 0), 0)

  const stats = [
    { label: 'Total Revenue (USD)', value: formatUSD(totalRevenue) },
    { label: 'Total Volume Sold', value: `${totalVolume.toLocaleString()} kg` },
    { label: 'Total Orders', value: totalOrders.toString() },
    { label: 'Active Customers', value: (customerCount ?? 0).toString() },
  ]

  const statusColors: Record<string, string> = {
    delivered: '#d4f0d4',
    shipped: '#fdeec0',
    processing: '#d6e7fb',
    cancelled: '#f5d6d6',
  }

  return (
    <div>
      <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>Executive Dashboard</h1>
      <p style={{ color: '#6b8f5e', marginBottom: 24 }}>Overview of Somxay Coffee sales performance</p>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 32 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: 12, color: '#6b8f5e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#2d4a3a', margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <h2 style={{ color: '#2d7a3a', fontSize: 18, marginBottom: 16 }}>Recent Orders</h2>
        {totalOrders === 0 ? (
          <p style={{ color: '#999' }}>No orders yet. Once orders are recorded, they will appear here.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#6b8f5e', borderBottom: '1px solid #eee' }}>
                <th style={{ padding: '8px 0' }}>Date</th>
                <th>Customer</th>
                <th>Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const customer = Array.isArray(o.customers) ? o.customers[0] : o.customers
                return (
                  <tr key={o.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '10px 0' }}>{o.order_date}</td>
                    <td>{customer?.company_name ?? '-'}</td>
                    <td style={{ color: '#2d7a3a', fontWeight: 600 }}>{formatUSD(o.total_usd ?? 0)}</td>
                    <td>
                      <span style={{ background: statusColors[o.status] ?? '#eee', padding: '2px 10px', borderRadius: 999, fontSize: 12 }}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
