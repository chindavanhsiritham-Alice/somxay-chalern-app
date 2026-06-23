import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, money } from '@/lib/portal'

interface OrderRow {
  id: string
  order_date: string | null
  created_at: string | null
  status: string
  total_usd: number | null
}

export default async function PortalOrdersPage() {
  const supabase = await createClient()
  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_date, created_at, status, total_usd')
    .order('created_at', { ascending: false })

  const rows = (orders as OrderRow[]) ?? []

  return (
    <div>
      <h1 style={{ color: '#2d4a3a', marginBottom: 16 }}>My Orders</h1>

      {rows.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 32, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <p style={{ color: '#999', marginTop: 0 }}>You have not placed any orders yet.</p>
          <Link href="/portal/products" style={{ color: '#2d7a3a', fontWeight: 600 }}>
            Browse products →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {rows.map((o) => {
            const c = ORDER_STATUS_COLORS[o.status] ?? { bg: '#eee', fg: '#555' }
            return (
              <Link
                key={o.id}
                href={`/portal/orders/${o.id}`}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: 16,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#2d4a3a' }}>Order #{o.id.slice(0, 8)}</div>
                  <div style={{ fontSize: 13, color: '#6b8f5e' }}>{(o.created_at ?? o.order_date ?? '').slice(0, 10)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <strong style={{ color: '#2d7a3a' }}>{money('$', o.total_usd)}</strong>
                  <span style={{ background: c.bg, color: c.fg, padding: '3px 12px', borderRadius: 999, fontSize: 12 }}>
                    {ORDER_STATUS_LABELS[o.status] ?? o.status}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
