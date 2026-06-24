'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { farmerTheme } from '@/lib/farmer/theme'
import type { CherryPriceRecord } from '@/lib/farmer/prices'
import { getSlotAvailability } from '@/lib/farmer/slots'
import {
  COFFEE_TYPES,
  DELIVERY_POINTS,
  QUANTITY_UNITS,
  generateBookingCode,
  generateQueueNumber,
  toKg,
  type CoffeeType,
  type DeliveryPoint,
  type DeliverySlot,
  type QuantityUnit,
  type SlotAvailability,
} from '@/lib/farmer/types'

export default function SellCherryForm({
  farmerId,
  prices,
  slots,
}: {
  farmerId: string
  prices: Record<CoffeeType, CherryPriceRecord>
  slots: DeliverySlot[]
}) {
  const supabase = createClient()
  const router = useRouter()

  const [coffeeType, setCoffeeType] = useState<CoffeeType>(COFFEE_TYPES[0])
  const [quantity, setQuantity] = useState('')
  const [quantityUnit, setQuantityUnit] = useState<QuantityUnit>('kg')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [slotId, setSlotId] = useState('')
  const [availability, setAvailability] = useState<SlotAvailability[]>([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [deliveryPoint, setDeliveryPoint] = useState<DeliveryPoint>(DELIVERY_POINTS[0])
  const [photo, setPhoto] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [queueNumber, setQueueNumber] = useState('')

  const todayPrice = prices[coffeeType]?.price_per_kg ?? 0

  async function handleDateChange(value: string) {
    setDeliveryDate(value)
    setSlotId('')
    setAvailability([])
    if (!value) return

    setLoadingAvailability(true)
    const rows = await getSlotAvailability(supabase, value)
    setLoadingAvailability(false)
    setAvailability(rows)
  }

  function availabilityFor(id: string) {
    return availability.find((a) => a.slot_id === id)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const quantityValue = Number(quantity)
    if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
      setError('กรุณากรอกปริมาณที่ถูกต้อง')
      return
    }
    if (!deliveryDate || !slotId) {
      setError('กรุณาเลือกวันและช่วงเวลาส่งสินค้า')
      return
    }

    const slot = slots.find((s) => s.id === slotId)
    if (!slot) {
      setError('ช่วงเวลาที่เลือกไม่ถูกต้อง กรุณาเลือกใหม่')
      return
    }

    setSubmitting(true)

    const freshAvailability = await getSlotAvailability(supabase, deliveryDate)
    const slotAvailability = freshAvailability.find((a) => a.slot_id === slotId)
    if (slotAvailability && toKg(quantityValue, quantityUnit) > slotAvailability.remaining_kg) {
      setError(`ช่วงเวลานี้เต็มแล้ว (เหลือที่ว่าง ${slotAvailability.remaining_kg.toLocaleString()} กก.) กรุณาเลือกช่วงเวลาอื่น`)
      setAvailability(freshAvailability)
      setSubmitting(false)
      return
    }

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

    const year = new Date(deliveryDate).getFullYear()
    const { data: sequence, error: sequenceError } = await supabase.rpc('next_queue_number', { p_year: year })
    if (sequenceError || typeof sequence !== 'number') {
      setError('ไม่สามารถสร้างหมายเลขคิวได้ กรุณาลองใหม่')
      setSubmitting(false)
      return
    }
    const newQueueNumber = generateQueueNumber(year, sequence)

    const { error: insertError } = await supabase.from('cherry_bookings').insert({
      booking_code: generateBookingCode(),
      farmer_id: farmerId,
      coffee_type: coffeeType,
      estimated_quantity: quantityValue,
      quantity_unit: quantityUnit,
      delivery_date: deliveryDate,
      delivery_time: slot.start_time,
      delivery_point: deliveryPoint,
      photo_url: photoUrl,
      price_at_booking: todayPrice,
      status: 'pending',
      slot_id: slotId,
      queue_number: newQueueNumber,
      arrival_status: 'waiting',
    })

    setSubmitting(false)
    if (insertError) {
      setError('ไม่สามารถบันทึกรายการขายได้ กรุณาลองใหม่')
      return
    }

    setQueueNumber(newQueueNumber)
  }

  if (queueNumber) {
    return (
      <div>
        <h1 style={{ color: farmerTheme.greenDark, fontSize: 20, marginBottom: 16 }}>ขายเชอร์รี่</h1>
        <div style={{ background: farmerTheme.card, border: `1px solid ${farmerTheme.border}`, borderRadius: 14, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: farmerTheme.muted, marginBottom: 8 }}>บันทึกการขายสำเร็จ หมายเลขคิวของคุณคือ</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: farmerTheme.green, marginBottom: 16 }}>{queueNumber}</div>
          <button
            onClick={() => router.push('/farmer/bookings')}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 10,
              border: 'none',
              background: farmerTheme.green,
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            ดูรายการขายของฉัน
          </button>
        </div>
      </div>
    )
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
        <input type="date" value={deliveryDate} onChange={(e) => handleDateChange(e.target.value)} required style={selectStyle} />

        <FieldLabel>ช่วงเวลาส่งสินค้า</FieldLabel>
        {!deliveryDate ? (
          <p style={{ fontSize: 12, color: farmerTheme.muted, marginBottom: 14 }}>กรุณาเลือกวันที่ก่อน</p>
        ) : loadingAvailability ? (
          <p style={{ fontSize: 12, color: farmerTheme.muted, marginBottom: 14 }}>กำลังโหลดช่วงเวลา...</p>
        ) : (
          <select value={slotId} onChange={(e) => setSlotId(e.target.value)} required style={selectStyle}>
            <option value="">-- เลือกช่วงเวลา --</option>
            {slots.map((s) => {
              const avail = availabilityFor(s.id)
              const remaining = avail ? Math.max(0, avail.remaining_kg) : s.capacity_kg
              const full = remaining <= 0
              return (
                <option key={s.id} value={s.id} disabled={full}>
                  {s.start_time.slice(0, 5)}-{s.end_time.slice(0, 5)} (เหลือ {remaining.toLocaleString()} กก.){full ? ' เต็ม' : ''}
                </option>
              )
            })}
          </select>
        )}

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
