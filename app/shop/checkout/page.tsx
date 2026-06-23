'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/lib/shop/cart-context'
import { shopTheme } from '@/lib/shop/theme'
import { cartItemLineTotal } from '@/lib/shop/types'
import { placeOrder } from '@/lib/shop/actions'

const BRANCHES = ['สาขาตลาดเช้า เวียงจันทน์', 'สาขาหลวงพระบาง', 'สาขาปากเซ']
const PAYMENT_METHODS = ['เงินสดหน้าร้าน', 'โอนเงิน/พร้อมเพย์']

export default function CheckoutPage() {
  const { items, totalPrice, clear } = useCart()
  const router = useRouter()
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [pickupBranch, setPickupBranch] = useState(BRANCHES[0])
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0])
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <p style={{ color: shopTheme.muted, marginBottom: 20 }}>ตะกร้าของคุณว่างเปล่า</p>
        <Link href="/shop" style={{ background: shopTheme.maroon, color: '#fff', padding: '10px 24px', borderRadius: 999, textDecoration: 'none' }}>
          ดูเมนู
        </Link>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const result = await placeOrder({ customerName, customerPhone, pickupBranch, paymentMethod, note, items })

    if ('error' in result) {
      setError(result.error)
      setSubmitting(false)
      return
    }

    clear()
    router.push(`/shop/order/${result.orderId}`)
  }

  return (
    <div>
      <h1 style={{ color: shopTheme.maroon, fontSize: 22, marginBottom: 20 }}>ชำระเงิน</h1>

      <div style={{ background: '#fff', border: `1px solid ${shopTheme.border}`, borderRadius: 14, padding: 18, marginBottom: 20 }}>
        {items.map((item) => (
          <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span>
              {item.name} x{item.quantity}
            </span>
            <span>{cartItemLineTotal(item)} บาท</span>
          </div>
        ))}
        <div style={{ borderTop: `1px solid ${shopTheme.border}`, marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
          <span>รวมทั้งหมด</span>
          <span style={{ color: shopTheme.maroon }}>{totalPrice} บาท</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ background: '#fff', border: `1px solid ${shopTheme.border}`, borderRadius: 14, padding: 20 }}>
        <InputField label="ชื่อผู้สั่ง" value={customerName} onChange={setCustomerName} required />
        <InputField label="เบอร์โทรศัพท์" value={customerPhone} onChange={setCustomerPhone} required type="tel" />

        <FieldLabel>สาขารับสินค้า</FieldLabel>
        <select value={pickupBranch} onChange={(e) => setPickupBranch(e.target.value)} style={selectStyle}>
          {BRANCHES.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>

        <FieldLabel>วิธีชำระเงิน</FieldLabel>
        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={selectStyle}>
          {PAYMENT_METHODS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>

        <FieldLabel>หมายเหตุ (ถ้ามี)</FieldLabel>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} style={{ ...selectStyle, resize: 'vertical' as const }} />

        {error && <p style={{ color: '#c0392b', fontSize: 13, marginTop: 8 }}>{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            marginTop: 16,
            padding: '14px',
            borderRadius: 10,
            border: 'none',
            background: shopTheme.maroon,
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            cursor: submitting ? 'default' : 'pointer',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? 'กำลังส่งคำสั่งซื้อ...' : `ยืนยันสั่งซื้อ · ${totalPrice} บาท`}
        </button>
      </form>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: `1px solid ${shopTheme.border}`,
  fontSize: 14,
  marginBottom: 14,
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, color: shopTheme.muted, marginBottom: 6, fontWeight: 600 }}>{children}</div>
}

function InputField({
  label,
  value,
  onChange,
  required,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  type?: string
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} style={selectStyle} />
    </div>
  )
}
