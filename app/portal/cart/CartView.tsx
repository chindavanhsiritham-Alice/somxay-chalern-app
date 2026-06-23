'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cart, cartTotals, useCart } from '@/lib/cart'
import { money } from '@/lib/portal'

export default function CartView({ approved }: { approved: boolean }) {
  const supabase = createClient()
  const router = useRouter()
  const items = useCart()
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')

  const totals = cartTotals(items)

  function changeQty(id: string, value: string) {
    const qty = Number(value)
    if (!Number.isFinite(qty) || qty <= 0) return
    cart.setQuantity(id, qty)
  }

  async function checkout() {
    setPlacing(true)
    setError('')
    const payload = items.map((i) => ({ catalog_product_id: i.catalog_product_id, quantity_kg: i.quantity_kg }))
    const { data, error: rpcError } = await supabase.rpc('create_customer_order', { p_items: payload })
    setPlacing(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    cart.clear()
    router.push(`/portal/orders/${data}`)
    router.refresh()
  }

  return (
    <div>
      <h1 style={{ color: '#2d4a3a', marginBottom: 16 }}>Your Cart</h1>

      {items.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 32, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <p style={{ color: '#999', marginTop: 0 }}>Your cart is empty.</p>
          <Link href="/portal/products" style={{ color: '#2d7a3a', fontWeight: 600 }}>
            Browse products →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {items.map((i) => {
              const over = i.available_kg != null && i.quantity_kg > i.available_kg
              return (
                <div
                  key={i.catalog_product_id}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 0', borderBottom: '1px solid #f2f2f2' }}
                >
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontWeight: 600, color: '#2d4a3a' }}>{i.name}</div>
                    <div style={{ fontSize: 13, color: '#6b8f5e' }}>
                      {i.grade ?? ''} · {money('$', i.unit_price_usd)}/kg
                    </div>
                    {over && <div style={{ fontSize: 12, color: '#9a2a2a' }}>Only {i.available_kg?.toLocaleString()} kg available</div>}
                  </div>
                  <input
                    type="number"
                    min={1}
                    defaultValue={i.quantity_kg}
                    onBlur={(e) => changeQty(i.catalog_product_id, e.target.value)}
                    style={{ width: 90, padding: '7px', border: '1px solid #ccc', borderRadius: 8, fontSize: 14 }}
                  />
                  <span style={{ fontSize: 13, color: '#999' }}>kg</span>
                  <div style={{ width: 110, textAlign: 'right', fontWeight: 600, color: '#2d7a3a' }}>
                    {money('$', i.quantity_kg * (i.unit_price_usd ?? 0))}
                  </div>
                  <button
                    onClick={() => cart.remove(i.catalog_product_id)}
                    style={{ background: 'none', border: 'none', color: '#9a2a2a', cursor: 'pointer', fontSize: 13 }}
                  >
                    Remove
                  </button>
                </div>
              )
            })}
          </div>

          <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, marginBottom: 6 }}>
              <span style={{ color: '#555' }}>Total (USD)</span>
              <strong style={{ color: '#2d4a3a' }}>{money('$', totals.usd)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b8f5e' }}>
              <span>THB / LAK</span>
              <span>
                {money('฿', totals.thb)} · {money('₭', totals.lak)}
              </span>
            </div>

            {error && <p style={{ color: '#c0392b', fontSize: 13 }}>{error}</p>}

            {!approved && (
              <p style={{ background: '#fdeec0', color: '#8a6d1a', padding: '10px 12px', borderRadius: 8, fontSize: 13 }}>
                Your account must be approved before you can place an order.
              </p>
            )}

            <button
              onClick={checkout}
              disabled={!approved || placing}
              style={{
                width: '100%',
                marginTop: 12,
                background: approved && !placing ? '#2d7a3a' : '#cfe0cf',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: 13,
                fontSize: 15,
                fontWeight: 600,
                cursor: approved && !placing ? 'pointer' : 'default',
              }}
            >
              {placing ? 'Placing order…' : 'Place order'}
            </button>
            <p style={{ fontSize: 12, color: '#999', textAlign: 'center', marginBottom: 0 }}>
              Prepaid · payment due within 5 days of ordering
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
