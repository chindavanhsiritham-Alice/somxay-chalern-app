'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ARRIVAL_STATUS_LABELS,
  ARRIVAL_STATUS_ORDER,
  toKg,
  type ArrivalStatus,
  type DeliverySlot,
} from '@/lib/farmer/types'

type FarmerInfo = { full_name: string; phone: string | null; village: string | null }

export type AdminQueueBookingRow = {
  id: string
  booking_code: string
  queue_number: string | null
  estimated_quantity: number
  quantity_unit: string
  coffee_type: string
  delivery_point: string
  status: string
  arrival_status: ArrivalStatus
  slot_id: string | null
  arrived_at: string | null
  weighing_started_at: string | null
  quality_check_started_at: string | null
  completed_at: string | null
  farmers: FarmerInfo[] | FarmerInfo | null
}

function toOne<T>(v: T[] | T | null | undefined): T | null {
  if (v == null) return null
  return Array.isArray(v) ? v[0] ?? null : v
}

const NEXT_STAGE: Record<ArrivalStatus, ArrivalStatus | null> = {
  waiting: 'arrived',
  arrived: 'weighing',
  weighing: 'quality_check',
  quality_check: 'completed',
  completed: null,
}

const STAGE_TIMESTAMP_FIELD: Partial<Record<ArrivalStatus, keyof AdminQueueBookingRow>> = {
  arrived: 'arrived_at',
  weighing: 'weighing_started_at',
  quality_check: 'quality_check_started_at',
  completed: 'completed_at',
}

const STAGE_COLORS: Record<ArrivalStatus, { bg: string; fg: string }> = {
  waiting: { bg: '#fbe6c8', fg: '#8a5a00' },
  arrived: { bg: '#d6e8ff', fg: '#1a4f8a' },
  weighing: { bg: '#e6d6ff', fg: '#5a1a8a' },
  quality_check: { bg: '#ffe0d6', fg: '#8a3a1a' },
  completed: { bg: '#d4f0d4', fg: '#256029' },
}

export default function DeliveryQueueManager({
  today,
  initialSlots,
  initialBookings,
}: {
  today: string
  initialSlots: DeliverySlot[]
  initialBookings: AdminQueueBookingRow[]
}) {
  const supabase = createClient()
  const [slots, setSlots] = useState<DeliverySlot[]>(initialSlots)
  const [bookings, setBookings] = useState<AdminQueueBookingRow[]>(initialBookings)
  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd] = useState('')
  const [newCapacity, setNewCapacity] = useState('1000')
  const [savingSlot, setSavingSlot] = useState(false)
  const [slotError, setSlotError] = useState('')

  const totalTonnageKg = useMemo(
    () => bookings.filter((b) => b.status !== 'cancelled').reduce((s, b) => s + toKg(Number(b.estimated_quantity), b.quantity_unit), 0),
    [bookings]
  )

  const countsByStage = useMemo(() => {
    const counts: Record<ArrivalStatus, number> = { waiting: 0, arrived: 0, weighing: 0, quality_check: 0, completed: 0 }
    for (const b of bookings) {
      if (b.status === 'cancelled') continue
      counts[b.arrival_status] = (counts[b.arrival_status] ?? 0) + 1
    }
    return counts
  }, [bookings])

  const slotSchedule = useMemo(() => {
    return slots.map((slot) => {
      const slotBookings = bookings.filter((b) => b.slot_id === slot.id && b.status !== 'cancelled')
      const kg = slotBookings.reduce((s, b) => s + toKg(Number(b.estimated_quantity), b.quantity_unit), 0)
      return { slot, bookingCount: slotBookings.length, kg }
    })
  }, [slots, bookings])

  async function handleAddSlot(e: React.FormEvent) {
    e.preventDefault()
    setSlotError('')
    const capacity = Number(newCapacity)
    if (!newStart || !newEnd || !Number.isFinite(capacity) || capacity <= 0) {
      setSlotError('กรุณากรอกข้อมูลช่วงเวลาให้ถูกต้อง')
      return
    }
    setSavingSlot(true)
    const { data, error } = await supabase
      .from('delivery_slots')
      .insert({ start_time: newStart, end_time: newEnd, capacity_kg: capacity, active: true })
      .select('id, start_time, end_time, capacity_kg, active, created_at')
      .single()
    setSavingSlot(false)
    if (error || !data) {
      setSlotError('ไม่สามารถเพิ่มช่วงเวลาได้')
      return
    }
    setSlots((list) => [...list, data as DeliverySlot].sort((a, b) => a.start_time.localeCompare(b.start_time)))
    setNewStart('')
    setNewEnd('')
    setNewCapacity('1000')
  }

  async function toggleSlotActive(slot: DeliverySlot) {
    const { error } = await supabase.from('delivery_slots').update({ active: !slot.active }).eq('id', slot.id)
    if (error) return
    setSlots((list) => list.map((s) => (s.id === slot.id ? { ...s, active: !s.active } : s)))
  }

  async function advanceStage(booking: AdminQueueBookingRow) {
    const next = NEXT_STAGE[booking.arrival_status]
    if (!next) return
    const field = STAGE_TIMESTAMP_FIELD[next]
    const payload: Record<string, unknown> = { arrival_status: next }
    if (field) payload[field] = new Date().toISOString()

    const { error } = await supabase.from('cherry_bookings').update(payload).eq('id', booking.id)
    if (error) return
    setBookings((list) => list.map((b) => (b.id === booking.id ? { ...b, ...payload } as AdminQueueBookingRow : b)))
  }

  return (
    <div>
      <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>คิวรับเชอร์รี่</h1>
      <p style={{ color: '#6b8f5e', marginBottom: 20 }}>ตารางส่งวันนี้ ({today}) และการจัดการคิวที่จุดรับซื้อ</p>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 24 }}>
        <SummaryCard label="ปริมาณรวมวันนี้" value={`${totalTonnageKg.toLocaleString()} กก.`} />
        {ARRIVAL_STATUS_ORDER.map((stage) => (
          <SummaryCard key={stage} label={ARRIVAL_STATUS_LABELS[stage]} value={String(countsByStage[stage])} />
        ))}
      </div>

      <Section title="ตารางเวลาและปริมาณคาดการณ์">
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f7f2', textAlign: 'left' }}>
                <th style={th}>ช่วงเวลา</th>
                <th style={th}>ความจุ (กก.)</th>
                <th style={th}>จองแล้ว (กก.)</th>
                <th style={th}>จำนวนคิว</th>
                <th style={th}>สถานะช่วงเวลา</th>
              </tr>
            </thead>
            <tbody>
              {slotSchedule.map(({ slot, bookingCount, kg }) => (
                <tr key={slot.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>
                    {slot.start_time.slice(0, 5)}-{slot.end_time.slice(0, 5)}
                  </td>
                  <td style={td}>{slot.capacity_kg.toLocaleString()}</td>
                  <td style={td}>{kg.toLocaleString()}</td>
                  <td style={td}>{bookingCount}</td>
                  <td style={td}>
                    <button onClick={() => toggleSlotActive(slot)} style={{ ...smallButton, background: slot.active ? '#2d7a3a' : '#aaa' }}>
                      {slot.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form onSubmit={handleAddSlot} style={{ marginTop: 12, background: '#fbfdf9', border: '1px solid #e6e0d2', borderRadius: 10, padding: 12 }}>
          <h4 style={{ fontSize: 12, color: '#2d4a3a', marginBottom: 8 }}>เพิ่มช่วงเวลาส่งสินค้า</h4>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', marginBottom: 8 }}>
            <label>
              <span style={fieldLabel}>เวลาเริ่ม</span>
              <input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} style={fieldInput} />
            </label>
            <label>
              <span style={fieldLabel}>เวลาสิ้นสุด</span>
              <input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} style={fieldInput} />
            </label>
            <label>
              <span style={fieldLabel}>ความจุ (กก.)</span>
              <input type="number" min="0" step="any" value={newCapacity} onChange={(e) => setNewCapacity(e.target.value)} style={fieldInput} />
            </label>
          </div>
          {slotError && <p style={{ color: '#c0392b', fontSize: 12, marginBottom: 8 }}>{slotError}</p>}
          <button type="submit" disabled={savingSlot} style={primaryButton}>
            {savingSlot ? 'กำลังบันทึก...' : 'เพิ่มช่วงเวลา'}
          </button>
        </form>
      </Section>

      <Section title="คิวรับเชอร์รี่วันนี้">
        {bookings.length === 0 ? (
          <p style={{ color: '#999' }}>ยังไม่มีรายการจองส่งวันนี้</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {bookings.map((b) => {
              const farmer = toOne(b.farmers)
              const next = NEXT_STAGE[b.arrival_status]
              const colors = STAGE_COLORS[b.arrival_status]
              return (
                <div key={b.id} style={{ background: '#fff', borderRadius: 12, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#2d4a3a' }}>
                        {b.queue_number ?? b.booking_code} {b.queue_number && <span style={{ color: '#999', fontWeight: 400 }}>({b.booking_code})</span>}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b8f5e' }}>
                        {farmer?.full_name ?? 'ไม่ทราบชื่อ'} · {farmer?.village ?? '-'}
                      </div>
                    </div>
                    <span style={{ background: colors.bg, color: colors.fg, fontSize: 11, padding: '3px 10px', borderRadius: 999, fontWeight: 600 }}>
                      {ARRIVAL_STATUS_LABELS[b.arrival_status]}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#444', marginTop: 8 }}>
                    {b.coffee_type} · {b.estimated_quantity} {b.quantity_unit} · {b.delivery_point}
                  </div>
                  {next && (
                    <button onClick={() => advanceStage(b)} style={{ ...smallButton, marginTop: 10, background: '#2d7a3a' }}>
                      เปลี่ยนเป็น &quot;{ARRIVAL_STATUS_LABELS[next]}&quot;
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 16, color: '#2d4a3a', marginBottom: 10 }}>{title}</h2>
      {children}
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 12, color: '#6b8f5e', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#2d4a3a' }}>{value}</div>
    </div>
  )
}

const th: React.CSSProperties = { padding: '10px 14px', fontWeight: 600, color: '#2d4a3a' }
const td: React.CSSProperties = { padding: '10px 14px', color: '#444' }
const fieldLabel: React.CSSProperties = { fontSize: 11, color: '#6b8f5e', marginBottom: 4, display: 'block' }
const fieldInput: React.CSSProperties = { width: '100%', padding: '6px 8px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }
const primaryButton: React.CSSProperties = { background: '#2d7a3a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const smallButton: React.CSSProperties = { color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
