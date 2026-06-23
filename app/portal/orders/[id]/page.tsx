import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ORDER_FLOW, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, money, daysLeft } from '@/lib/portal'
import OrderActions from './OrderActions'

interface OrderItem {
  id: string
  product_name: string | null
  quantity_kg: number | null
  unit_price_usd: number | null
  line_total_usd: number | null
  line_total_thb: number | null
  line_total_lak: number | null
}
interface Order {
  id: string
  status: string
  created_at: string | null
  order_date: string | null
  payment_deadline: string | null
  payment_submitted_at: string | null
  payment_slip_url: string | null
  subtotal_usd: number | null
  subtotal_thb: number | null
  subtotal_lak: number | null
  total_usd: number | null
  order_items: OrderItem[]
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('orders')
    .select(
      'id, status, created_at, order_date, payment_deadline, payment_submitted_at, payment_slip_url, subtotal_usd, subtotal_thb, subtotal_lak, total_usd, order_items(id, product_name, quantity_kg, unit_price_usd, line_total_usd, line_total_thb, line_total_lak)'
    )
    .eq('id', id)
    .maybeSingle()

  if (!data) notFound()
  const order = data as Order

  let slipUrl: string | null = null
  if (order.payment_slip_url) {
    const { data: signed } = await supabase.storage.from('payment_slips').createSignedUrl(order.payment_slip_url, 3600)
    slipUrl = signed?.signedUrl ?? null
  }

  const c = ORDER_STATUS_COLORS[order.status] ?? { bg: '#eee', fg: '#555' }
  const left = daysLeft(order.payment_deadline)
  const isCancelled = order.status === 'cancelled'

  return (
    <div style={{ maxWidth: 760 }}>
      <Link href="/portal/orders" style={{ color: '#6b8f5e', fontSize: 13, textDecoration: 'none' }}>
        ← Back to orders
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        <h1 style={{ color: '#2d4a3a', margin: 0 }}>Order #{order.id.slice(0, 8)}</h1>
        <span style={{ background: c.bg, color: c.fg, padding: '4px 14px', borderRadius: 999, fontSize: 13 }}>
          {ORDER_STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>
      <p style={{ color: '#6b8f5e', marginTop: 4 }}>Placed {(order.created_at ?? order.order_date ?? '').slice(0, 10)}</p>

      {/* Status timeline */}
      {!isCancelled && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '12px 0 20px' }}>
          {ORDER_FLOW.map((s, i) => {
            const reached = ORDER_FLOW.indexOf(order.status as (typeof ORDER_FLOW)[number]) >= i
            return (
              <span
                key={s}
                style={{
                  fontSize: 11,
                  padding: '3px 9px',
                  borderRadius: 999,
                  background: reached ? '#d4f0d4' : '#f0f0f0',
                  color: reached ? '#256029' : '#aaa',
                }}
              >
                {ORDER_STATUS_LABELS[s]}
              </span>
            )
          })}
        </div>
      )}

      {/* Items */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, color: '#2d7a3a', marginTop: 0 }}>Items</h2>
        {(order.order_items ?? []).map((it) => (
          <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f5f5f5', fontSize: 14 }}>
            <div>
              <div style={{ fontWeight: 600, color: '#2d4a3a' }}>{it.product_name ?? 'Product'}</div>
              <div style={{ fontSize: 13, color: '#6b8f5e' }}>
                {(it.quantity_kg ?? 0).toLocaleString()} kg × {money('$', it.unit_price_usd)}
              </div>
            </div>
            <strong style={{ color: '#2d7a3a' }}>{money('$', it.line_total_usd)}</strong>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 15 }}>
          <span style={{ color: '#555' }}>Total</span>
          <strong style={{ color: '#2d4a3a' }}>{money('$', order.total_usd ?? order.subtotal_usd)}</strong>
        </div>
        <div style={{ textAlign: 'right', fontSize: 13, color: '#6b8f5e' }}>
          {money('฿', order.subtotal_thb)} · {money('₭', order.subtotal_lak)}
        </div>
      </div>

      {/* Payment */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: 16, color: '#2d7a3a', marginTop: 0 }}>Payment</h2>
        {order.status === 'pending_payment' && (
          <p style={{ fontSize: 14, color: left != null && left <= 1 ? '#9a2a2a' : '#8a6d1a', marginTop: 0 }}>
            Prepaid — please pay within 5 days.
            {left != null && ` ${left > 0 ? `${left} day(s) left` : 'Deadline passed'}`}
            {order.payment_deadline && ` (by ${order.payment_deadline.slice(0, 10)})`}
          </p>
        )}
        {slipUrl && (
          <p style={{ fontSize: 14 }}>
            Payment slip:{' '}
            <a href={slipUrl} target="_blank" rel="noreferrer" style={{ color: '#2d7a3a', fontWeight: 600 }}>
              View uploaded slip
            </a>
          </p>
        )}

        <OrderActions orderId={order.id} status={order.status} />
      </div>
    </div>
  )
}
