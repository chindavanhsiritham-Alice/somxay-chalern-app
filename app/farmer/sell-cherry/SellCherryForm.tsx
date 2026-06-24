'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { farmerTheme } from '@/lib/farmer/theme'
import type { CherryPriceRecord } from '@/lib/farmer/prices'
import {
  COFFEE_TYPES,
  DELIVERY_POINTS,
  QUANTITY_UNITS,
  generateBookingCode,
  type CoffeeType,
  type DeliveryPoint,
  type QuantityUnit,
} from '@/lib/farmer/types'

export default function SellCherryForm({
  farmerId,
  prices,
}: {
  farmerId: string
  prices: Record<CoffeeType, CherryPriceRecord>
}) {
  const supabase = createClient()
  const router = useRouter()

  const [coffeeType, setCoffeeType] = useState<CoffeeType>(COFFEE_TYPES[0])
  const [quantity, setQuantity] = useState('')
  const [quantityUnit, setQuantityUnit] = useState<QuantityUnit>('kg')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [deliveryTime, setDeliveryTime] = useState('')
  const [deliveryPoint, setDeliveryPoint] = useState<DeliveryPoint>(DELIVERY_POINTS[0])
  const [photo, setPhoto] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const todayPrice = prices[coffeeType]?.price_per_kg ?? 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const quantityValue = Number(quantity)
    if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
      setError('กรุณากรอกปริมาณที่ถูกต้อง')
      return
    }
    if (!deliveryDate || !deliveryTime) {
      setError('กรุณาเลือกวันและเวลาส่งสินค้า')
      return
    }

    setSubmitting(true)

    let photoUrl: string | null = null
    if (photo) {
      const path = `${farmerId}/${Date.now()}-${photo.name}`
      const { error: uploadError } = await supabase.storage.from('cherry-photos').upload(path, photo)
      if (uploadError) {
        setError('ไม่สามารถอัปโหลดรูปภาพได้ กรุณาลองใหม่')
        setSubmitting(false)
        return
      }
      const { data: publicUrl } = supabase.storage.from('cherry-photos').getPublicUrl(path)
      photoUrl = publicUrl.publicUrl
    }

    const { error: insertError } = await supabase.from('cherry_bookings').insert({
      booking_code: generateBookingCode(),
      farmer_id: farmerId,
      coffee_type: coffeeType,
      estimated_quantity: quantityValue,
      quantity_unit: quantityUnit,
      delivery_date: deliveryDate,
      delivery_time: deliveryTime,
      delivery_point: deliveryPoint,
      photo_url: photoUrl,
      price_at_booking: todayPrice,
      status: 'pending',
    })

    setSubmitting(false)
    if (insertError) {
      setError('ไม่สามารถบันทึกรายการขายได้ กรุณาลองใหม่')
      return
    }

    router.push('/farmer/bookings')
  }

  return (
    <div>
      <h1 style={{ color: farmerTheme.greenDark, fontSize: 20, marginBottom: 16 }}>ขายเชอร์รี่</h1>

      <div style={{ background: farmerTheme.card, border: `1px solid ${farmerTheme.border}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: farmerTheme.muted, marginBottom: 4 }}>ราคารับซื้อวันนี้</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: farmerTheme.green }}>{todayPrice} บาท/กก.</div>
        <div style={{ fontSize: 12, color: farmerTheme.muted }}>{coffeeType}</div>
      </div>

      <form onSubmit={handleSubmit} style={{ background: farmerTheme.card, border: `1px solid ${farmerTheme.border}`, borderRadius: 14, padding: 18 }}>
        <FieldLabel>ชนิดกาแฟ</FieldLabel>
        <select value={coffeeType} onChange={(e) => setCoffeeType(e.target.value as CoffeeType)} style={selectStyle}>
          {COFFEE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <FieldLabel>ปริมาณที่คาดว่าจะขาย</FieldLabel>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input
            type="number"
            min="0"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            style={{ ...selectStyle, marginBottom: 0, flex: 2 }}
          />
          <select value={quantityUnit} onChange={(e) => setQuantityUnit(e.target.value as QuantityUnit)} style={{ ...selectStyle, marginBottom: 0, flex: 1 }}>
            {QUANTITY_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        <FieldLabel>วันที่ส่งสินค้า</FieldLabel>
        <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} required style={selectStyle} />

        <FieldLabel>เวลาส่งสินค้า</FieldLabel>
        <input type="time" value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} required style={selectStyle} />

        <FieldLabel>จุดส่งสินค้า</FieldLabel>
        <select value={deliveryPoint} onChange={(e) => setDeliveryPoint(e.target.value as DeliveryPoint)} style={selectStyle}>
          {DELIVERY_POINTS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <FieldLabel>รูปถ่ายเชอร์รี่ (ถ้ามี)</FieldLabel>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          style={{ marginBottom: 14, fontSize: 13 }}
        />

        {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 8 }}>{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 10,
            border: 'none',
            background: farmerTheme.green,
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            cursor: submitting ? 'default' : 'pointer',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? 'กำลังบันทึก...' : 'ยืนยันขายเชอร์รี่'}
        </button>
      </form>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: `1px solid ${farmerTheme.border}`,
  fontSize: 14,
  marginBottom: 14,
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, color: farmerTheme.muted, marginBottom: 6, fontWeight: 600 }}>{children}</div>
}
