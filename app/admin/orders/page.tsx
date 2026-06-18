import { createClient } from '@/lib/supabase/server'

export default async function OrdersPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('orders')
    .select(`id, order_date, status, total_usd, customers(customer_code, company_name), order_items(quantity_kg, products(name))`)
    .order('order_date', { ascending: false })

  const statusColors: Record<string, string> = {
    delivered: '#d4f0d4',
    shipped: '#fdeec0',
    processing: '#d6e7fb',
    cancelled: '#f5d6d6',
  }

  return (
    <div>
      <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>Orders</h1>
      <p style={{ color: '#6b8f5e', marginBottom: 24 }}>{orders?.length ?? 0} orders total</p>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#6b8f5e', borderBottom: '2px solid #eee' }}>
              <th style={{ padding: '10px 8px' }}>Date</th>
              <th style={{ padding: '10px 8px' }}>Code</th>
              <th style={{ padding: '10px 8px' }}>Customer</th>
              <th style={{ padding: '10px 8px' }}>Product</th>
              <th style={{ padding: '10px 8px', textAlign: 'right' }}>Qty (kg)</th>
              <th style={{ padding: '10px 8px', textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(orders ?? []).map((o: any) => {
              const customer = Array.isArray(o.customers) ? o.customers[0] : o.customers
              const items = o.order_items ?? []
              const totalQty = items.reduce((sum: number, i: {quantity_kg: number}) => sum + (i.quantity_kg ?? 0), 0)
              const productNames = items.map((i: {products: {name: string} | null}) => i.products?.name).filter(Boolean).join(', ')
              return (
                <tr key={o.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '12px 8px' }}>{o.order_date}</td>
                  <td style={{ padding: '12px 8px', color: '#6b8f5e', fontWeight: 600 }}>{customer?.customer_code ?? '-'}</td>
                  <td style={{ padding: '12px 8px' }}>{customer?.company_name ?? '-'}</td>
                  <td style={{ padding: '12px 8px', color: '#555' }}>{productNames || '-'}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600 }}>{totalQty.toLocaleString()}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    <span style={{ background: statusColors[o.status] ?? '#eee', padding: '3px 12px', borderRadius: 999, fontSize: 12 }}>
                      {o.status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
