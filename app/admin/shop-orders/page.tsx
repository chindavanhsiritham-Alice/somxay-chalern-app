import { createClient } from '@/lib/supabase/server'

const STATUS_COLORS: Record<string, string> = {
  received: '#d6e7fb',
  preparing: '#fdeec0',
  ready: '#d4f0d4',
  completed: '#e0e0e0',
  cancelled: '#f5d6d6',
}

export default async function ShopOrdersPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('shop_orders')
    .select('id, order_code, customer_name, customer_phone, pickup_branch, payment_method, total, status, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div>
      <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>Shop Orders</h1>
      <p style={{ color: '#6b8f5e', marginBottom: 24 }}>{orders?.length ?? 0} orders from the coffee shop storefront</p>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#6b8f5e', borderBottom: '2px solid #eee' }}>
              <th style={{ padding: '10px 8px' }}>Time</th>
              <th style={{ padding: '10px 8px' }}>Order #</th>
              <th style={{ padding: '10px 8px' }}>Customer</th>
              <th style={{ padding: '10px 8px' }}>Branch</th>
              <th style={{ padding: '10px 8px' }}>Payment</th>
              <th style={{ padding: '10px 8px', textAlign: 'right' }}>Total</th>
              <th style={{ padding: '10px 8px', textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((o) => (
              <tr key={o.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                <td style={{ padding: '12px 8px' }}>{new Date(o.created_at).toLocaleString('th-TH')}</td>
                <td style={{ padding: '12px 8px', color: '#6b8f5e', fontWeight: 600 }}>{o.order_code}</td>
                <td style={{ padding: '12px 8px' }}>
                  {o.customer_name}
                  <div style={{ fontSize: 12, color: '#999' }}>{o.customer_phone}</div>
                </td>
                <td style={{ padding: '12px 8px' }}>{o.pickup_branch}</td>
                <td style={{ padding: '12px 8px' }}>{o.payment_method}</td>
                <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600 }}>{o.total} บาท</td>
                <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                  <span style={{ background: STATUS_COLORS[o.status] ?? '#eee', padding: '3px 12px', borderRadius: 999, fontSize: 12 }}>{o.status}</span>
                </td>
              </tr>
            ))}
            {(orders ?? []).length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 20, textAlign: 'center', color: '#999' }}>
                  No shop orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
