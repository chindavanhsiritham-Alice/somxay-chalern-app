'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, money } from '@/lib/portal'

interface OrderItem {
  product_name: string | null
  quantity_kg: number | null
  line_total_usd: number | null
}
interface CustomerRef {
  full_name: string | null
  company_name: string | null
  email: string | null
}
export interface AdminOrder {
  id: string
  status: string
  created_at: string | null
  payment_submitted_at: string | null
  payment_deadline: string | null
  payment_slip_url: string | null
  total_usd: number | null
  subtotal_thb: number | null
  subtotal_lak: number | null
  customers: CustomerRef | CustomerRef[] | null
  order_items: OrderItem[]
  slipUrl: string | null
}

const NEXT_STEP: Record<string, { status: string; label: string }> = {
  payment_confirmed: { status: 'preparing', label: 'Start preparing' },
  preparing: { status: 'ready_for_pickup', label: 'Mark ready for pickup' },
  ready_for_pickup: { status: 'completed', label: 'Mark completed' },
}

export default function PaymentReview({ orders }: { orders: AdminOrder[] }) {
  const supabase = createClient()
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function run(id: string, fn: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(id)
    setError('')
    const { error: e } = await fn()
    setBusy(null)
    if (e) {
      setError(e.message)
      return
    }
    router.refresh()
  }

  const reviewQueue = orders.filter((o) => o.status === 'payment_submitted')
  const inProgress = orders.filter((o) => o.status !== 'payment_submitted')

  return (
    <div>
      <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>Payments &amp; Fulfilment</h1>
      <p style={{ color: '#6b8f5e', marginBottom: 20 }}>Review submitted payments and move orders through fulfilment.</p>

      {error && <p style={{ background: '#f5d6d6', color: '#9a2a2a', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>{error}</p>}

      <h2 style={{ fontSize: 16, color: '#2d4a3a' }}>Awaiting payment review ({reviewQueue.length})</h2>
      {reviewQueue.length === 0 ? (
        <p style={{ color: '#999' }}>No payments to review.</p>
      ) : (
        <div style={{ display: 'grid', gap: 12, marginBottom: 28 }}>
          {reviewQueue.map((o) => (
            <OrderCard key={o.id} o={o} busy={busy === o.id}>
              <Action label="Confirm payment" color="#256029" disabled={busy === o.id} onClick={() => run(o.id, () => supabase.rpc('review_order_payment', { p_order_id: o.id, p_approve: true }))} />
              <Action label="Reject payment" color="#9a2a2a" disabled={busy === o.id} onClick={() => run(o.id, () => supabase.rpc('review_order_payment', { p_order_id: o.id, p_approve: false }))} />
            </OrderCard>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: 16, color: '#2d4a3a' }}>In progress ({inProgress.length})</h2>
      {inProgress.length === 0 ? (
        <p style={{ color: '#999' }}>No orders in fulfilment.</p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {inProgress.map((o) => {
            const next = NEXT_STEP[o.status]
            return (
              <OrderCard key={o.id} o={o} busy={busy === o.id}>
                {next && (
                  <Action label={next.label} color="#2d7a3a" disabled={busy === o.id} onClick={() => run(o.id, () => supabase.rpc('set_order_status', { p_order_id: o.id, p_status: next.status }))} />
                )}
                {o.status !== 'completed' && (
                  <Action label="Cancel order" color="#9a2a2a" disabled={busy === o.id} onClick={() => run(o.id, () => supabase.rpc('cancel_customer_order', { p_order_id: o.id }))} />
                )}
              </OrderCard>
            )
          })}
        </div>
      )}
    </div>
  )
}

function OrderCard({ o, busy, children }: { o: AdminOrder; busy: boolean; children: React.ReactNode }) {
  const customer = Array.isArray(o.customers) ? o.customers[0] : o.customers
  const c = ORDER_STATUS_COLORS[o.status] ?? { bg: '#eee', fg: '#555' }
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', opacity: busy ? 0.6 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 600, color: '#2d4a3a' }}>
            Order #{o.id.slice(0, 8)} · {money('$', o.total_usd)}
          </div>
          <div style={{ fontSize: 13, color: '#6b8f5e' }}>
            {customer?.full_name || customer?.company_name || '—'} · {customer?.email}
          </div>
          <div style={{ fontSize: 12, color: '#9aa', marginTop: 2 }}>
            {(o.order_items ?? []).map((i) => `${i.product_name ?? 'Item'} (${(i.quantity_kg ?? 0).toLocaleString()}kg)`).join(', ')}
          </div>
        </div>
        <span style={{ background: c.bg, color: c.fg, padding: '3px 12px', borderRadius: 999, fontSize: 12, height: 'fit-content' }}>
          {ORDER_STATUS_LABELS[o.status] ?? o.status}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 }}>
        {o.slipUrl ? (
          <a href={o.slipUrl} target="_blank" rel="noreferrer" style={{ color: '#2d7a3a', fontWeight: 600, fontSize: 13 }}>
            View payment slip
          </a>
        ) : (
          <span style={{ color: '#9aa', fontSize: 13 }}>No slip uploaded</span>
        )}
        {children}
      </div>
    </div>
  )
}

function Action({ label, color, onClick, disabled }: { label: string; color: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ background: '#fff', color, border: `1px solid ${color}`, borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 }}
    >
      {label}
    </button>
  )
}
