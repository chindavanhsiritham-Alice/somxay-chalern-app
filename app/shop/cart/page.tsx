'use client'

import Link from 'next/link'
import { useCart } from '@/lib/shop/cart-context'
import { shopTheme } from '@/lib/shop/theme'
import { cartItemLineTotal } from '@/lib/shop/types'

const SIZE_LABEL: Record<string, string> = { normal: 'ปกติ', large: 'ใหญ่' }
const TEMP_LABEL: Record<string, string> = { hot: 'ร้อน', iced: 'เย็น' }

export default function CartPage() {
  const { items, updateQuantity, removeItem, totalPrice } = useCart()

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
        <p style={{ color: shopTheme.muted, marginBottom: 20 }}>ตะกร้าของคุณว่างเปล่า</p>
        <Link
          href="/shop"
          style={{ background: shopTheme.maroon, color: '#fff', padding: '10px 24px', borderRadius: 999, textDecoration: 'none', fontSize: 14 }}
        >
          ดูเมนู
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 style={{ color: shopTheme.maroon, fontSize: 22, marginBottom: 20 }}>ตะกร้าของคุณ</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((item) => (
          <div
            key={item.key}
            style={{ background: '#fff', border: `1px solid ${shopTheme.border}`, borderRadius: 14, padding: 16, display: 'flex', gap: 12 }}
          >
            <div style={{ fontSize: 30 }}>{item.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{item.name}</div>
              <div style={{ fontSize: 12, color: shopTheme.muted }}>
                {SIZE_LABEL[item.size]} · {TEMP_LABEL[item.temperature]} · {item.sweetness}
                {item.addons.length > 0 && ` · ${item.addons.map((a) => a.name).join(', ')}`}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                <button
                  onClick={() => updateQuantity(item.key, item.quantity - 1)}
                  style={{ width: 28, height: 28, borderRadius: '50%', border: `1px solid ${shopTheme.border}`, background: '#fff', cursor: 'pointer' }}
                >
                  −
                </button>
                <span style={{ fontWeight: 600, minWidth: 16, textAlign: 'center' }}>{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.key, item.quantity + 1)}
                  style={{ width: 28, height: 28, borderRadius: '50%', border: `1px solid ${shopTheme.border}`, background: '#fff', cursor: 'pointer' }}
                >
                  +
                </button>
                <button onClick={() => removeItem(item.key)} style={{ marginLeft: 'auto', color: '#c0392b', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13 }}>
                  ลบ
                </button>
              </div>
            </div>
            <div style={{ fontWeight: 700, color: shopTheme.maroon, whiteSpace: 'nowrap' }}>{cartItemLineTotal(item)} บาท</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, background: '#fff', border: `1px solid ${shopTheme.border}`, borderRadius: 14, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
          <span>รวมทั้งหมด</span>
          <span style={{ color: shopTheme.maroon }}>{totalPrice} บาท</span>
        </div>
        <Link
          href="/shop/checkout"
          style={{
            display: 'block',
            textAlign: 'center',
            background: shopTheme.maroon,
            color: '#fff',
            padding: '14px',
            borderRadius: 10,
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          ไปหน้าชำระเงิน
        </Link>
      </div>
    </div>
  )
}
