'use client'

import { useMemo, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import {
  BOOKING_STATUS_LABELS,
  type BookingStatus,
  type CherryBooking,
  type CherryReceiving,
  type FarmerPayment,
} from '@/lib/farmer/types'

export type AdminBookingRow = CherryBooking & {
  farmers: { full_name: string; phone: string | null; village: string | null } | null
  cherry_receivings: CherryReceiving[] | CherryReceiving | null
  farmer_payments: FarmerPayment[] | FarmerPayment | null
}

function toOne<T>(v: T[] | T | null | undefined): T | null {
  if (v == null) return null
  return Array.isArray(v) ? v[0] ?? null : v
}

type Row = {
  booking: CherryBooking
  farmerName: string
  farmerPhone: string | null
  receiving: CherryReceiving | null
  payment: FarmerPayment | null
}

function toRow(r: AdminBookingRow): Row {
  return {
    booking: r,
    farmerName: r.farmers?.full_name ?? 'ไม่ทราบชื่อ',
    farmerPhone: r.farmers?.phone ?? null,
    receiving: toOne(r.cherry_receivings),
    payment: toOne(r.farmer_payments),
  }
}

const PAYMENT_METHODS = ['เงินสด', 'โอนเงิน/พร้อมเพย์']

const fieldLabel: React.CSSProperties = { fontSize: 11, color: '#6b8f5e', marginBottom: 4, display: 'block' }
const fieldInput: React.CSSProperties = { width: '100%', padding: '6px 8px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }
const primaryButton: React.CSSProperties = { background: '#2d7a3a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }

const BOOKING_STATUS_COLORS: Record<BookingStatus, { bg: string; fg: string }> = {
  pending: { bg: '#fbe6c8', fg: '#8a5a00' },
  confirmed: { bg: '#d6e8ff', fg: '#1a4f8a' },
  received: { bg: '#d4f0d4', fg: '#256029' },
  cancelled: { bg: '#f5d6d6', fg: '#9a2a2a' },
}

export default function CherryBookingsManager({ initialBookings }: { initialBookings: AdminBookingRow[] }) {
  const supabase = createClient()
  const [rows, setRows] = useState<Row[]>(initialBookings.map(toRow))
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) => r.booking.booking_code.toLowerCase().includes(q) || r.farmerName.toLowerCase().includes(q)
    )
  }, [rows, search])

  function updateRow(bookingId: string, patch: Partial<Row>) {
    setRows((list) => list.map((r) => (r.booking.id === bookingId ? { ...r, ...patch } : r)))
  }

  return (
    <div>
      <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>Cherry Bookings</h1>
      <p style={{ color: '#6b8f5e', marginBottom: 20 }}>รับเข้าเชอร์รี่จากเกษตรกร คำนวณและบันทึกการจ่ายเงิน</p>

      <input
        placeholder="ค้นหาเลขที่จอง หรือชื่อเกษตรกร..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: 8, fontSize: 13, width: 280, marginBottom: 16 }}
      />

      {filtered.length === 0 ? (
        <p style={{ color: '#999' }}>ไม่พบรายการ</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((row) => (
            <BookingCard
              key={row.booking.id}
              row={row}
              expanded={expandedId === row.booking.id}
              onToggle={() => setExpandedId((id) => (id === row.booking.id ? null : row.booking.id))}
              onUpdate={(patch) => updateRow(row.booking.id, patch)}
              supabase={supabase}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function BookingCard({
  row,
  expanded,
  onToggle,
  onUpdate,
  supabase,
}: {
  row: Row
  expanded: boolean
  onToggle: () => void
  onUpdate: (patch: Partial<Row>) => void
  supabase: SupabaseClient
}) {
  const { booking, farmerName, farmerPhone, receiving, payment } = row

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={onToggle}>
        <div>
          <div style={{ fontWeight: 700, color: '#2d4a3a' }}>{booking.booking_code}</div>
          <div style={{ fontSize: 12, color: '#6b8f5e' }}>
            {farmerName}
            {farmerPhone ? ` · ${farmerPhone}` : ''} · {booking.coffee_type} · {booking.estimated_quantity} {booking.quantity_unit}
          </div>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      {expanded && (
        <div style={{ marginTop: 14, borderTop: '1px solid #eee', paddingTop: 14 }}>
          <div style={{ fontSize: 12, color: '#6b8f5e', marginBottom: 10 }}>
            วันส่งสินค้า: {booking.delivery_date} {booking.delivery_time} · จุดส่ง: {booking.delivery_point} · ราคา ณ วันจอง: {booking.price_at_booking}{' '}
            บาท/กก.
          </div>
          {booking.photo_url && (
            <a
              href={booking.photo_url}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 12, color: '#2d7a3a', display: 'inline-block', marginBottom: 10 }}
            >
              ดูรูปถ่ายเชอร์รี่
            </a>
          )}

          {!receiving ? (
            <ReceivingForm
              booking={booking}
              supabase={supabase}
              onSaved={(savedReceiving, savedPayment) =>
                onUpdate({ receiving: savedReceiving, payment: savedPayment, booking: { ...booking, status: 'received' } })
              }
            />
          ) : payment && payment.status === 'pending' ? (
            <MarkPaidForm payment={payment} supabase={supabase} onSaved={(updatedPayment) => onUpdate({ payment: updatedPayment })} />
          ) : payment ? (
            <PaidSummary payment={payment} />
          ) : (
            <ReceivingSummary receiving={receiving} />
          )}
        </div>
      )}
    </div>
  )
}

function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const c = BOOKING_STATUS_COLORS[status]
  return <span style={{ background: c.bg, color: c.fg, fontSize: 11, padding: '2px 8px', borderRadius: 999 }}>{BOOKING_STATUS_LABELS[status]}</span>
}

function ReceivingForm({
  booking,
  supabase,
  onSaved,
}: {
  booking: CherryBooking
  supabase: SupabaseClient
  onSaved: (receiving: CherryReceiving, payment: FarmerPayment) => void
}) {
  const [truckPlate, setTruckPlate] = useState('')
  const [grossWeight, setGrossWeight] = useState('')
  const [tareWeight, setTareWeight] = useState('')
  const [qualityGrade, setQualityGrade] = useState('')
  const [defectPercent, setDefectPercent] = useState('')
  const [deductionPercent, setDeductionPercent] = useState('')
  const [acceptedWeightOverride, setAcceptedWeightOverride] = useState('')
  const [fertilizerDeduction, setFertilizerDeduction] = useState('0')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const netWeight = Number(grossWeight || 0) - Number(tareWeight || 0)
  const suggestedAccepted = netWeight > 0 ? netWeight * (1 - Number(deductionPercent || 0) / 100) : 0
  const acceptedWeight = acceptedWeightOverride !== '' ? Number(acceptedWeightOverride) : suggestedAccepted
  const grossAmount = acceptedWeight * booking.price_at_booking
  const netPayable = grossAmount - Number(fertilizerDeduction || 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!Number.isFinite(acceptedWeight) || acceptedWeight <= 0) {
      setError('กรุณากรอกน้ำหนักให้ถูกต้อง')
      return
    }
    setSaving(true)

    const { data: userData } = await supabase.auth.getUser()

    const { data: receivingRow, error: receivingError } = await supabase
      .from('cherry_receivings')
      .insert({
        booking_id: booking.id,
        truck_plate: truckPlate || null,
        gross_weight: Number(grossWeight) || null,
        tare_weight: Number(tareWeight) || null,
        net_weight: netWeight || null,
        quality_grade: qualityGrade || null,
        defect_percent: defectPercent === '' ? null : Number(defectPercent),
        deduction_percent: deductionPercent === '' ? null : Number(deductionPercent),
        accepted_weight: acceptedWeight,
        recorded_by: userData.user?.id ?? null,
      })
      .select()
      .single()

    if (receivingError || !receivingRow) {
      setError('ไม่สามารถบันทึกข้อมูลรับเข้าได้')
      setSaving(false)
      return
    }

    await supabase.from('cherry_bookings').update({ status: 'received' }).eq('id', booking.id)

    const fertilizerAmount = Number(fertilizerDeduction) || 0
    const { data: paymentRow, error: paymentError } = await supabase
      .from('farmer_payments')
      .insert({
        booking_id: booking.id,
        farmer_id: booking.farmer_id,
        accepted_weight: acceptedWeight,
        price_per_kg: booking.price_at_booking,
        gross_amount: grossAmount,
        fertilizer_deduction: fertilizerAmount,
        net_payable: netPayable,
        status: 'pending',
      })
      .select()
      .single()

    setSaving(false)
    if (paymentError || !paymentRow) {
      setError('บันทึกข้อมูลรับเข้าแล้ว แต่ไม่สามารถคำนวณเงินจ่ายได้')
      return
    }

    if (fertilizerAmount > 0) {
      const { data: debtRow } = await supabase.from('farmer_debts').select('balance').eq('farmer_id', booking.farmer_id).maybeSingle()
      const newBalance = Math.max(0, Number(debtRow?.balance ?? 0) - fertilizerAmount)
      await supabase
        .from('farmer_debts')
        .upsert({ farmer_id: booking.farmer_id, balance: newBalance, updated_at: new Date().toISOString() }, { onConflict: 'farmer_id' })
    }

    onSaved(receivingRow as CherryReceiving, paymentRow as FarmerPayment)
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ fontSize: 13, color: '#2d4a3a', marginBottom: 10 }}>ยืนยันรับเข้า &amp; คำนวณเงิน</h3>
      <FieldGrid>
        <TextField label="ทะเบียนรถ" value={truckPlate} onChange={setTruckPlate} />
        <NumberField label="น้ำหนักรวม (กก.)" value={grossWeight} onChange={setGrossWeight} />
        <NumberField label="น้ำหนักรถเปล่า (กก.)" value={tareWeight} onChange={setTareWeight} />
        <ReadOnlyField label="น้ำหนักสุทธิ (กก.)" value={netWeight.toFixed(2)} />
        <TextField label="เกรดคุณภาพ" value={qualityGrade} onChange={setQualityGrade} />
        <NumberField label="% ตำหนิ" value={defectPercent} onChange={setDefectPercent} />
        <NumberField label="% หัก" value={deductionPercent} onChange={setDeductionPercent} />
        <NumberField label="น้ำหนักที่รับซื้อ (กก.)" value={acceptedWeightOverride} onChange={setAcceptedWeightOverride} placeholder={suggestedAccepted.toFixed(2)} />
        <NumberField label="หักค่าปุ๋ย (บาท)" value={fertilizerDeduction} onChange={setFertilizerDeduction} />
      </FieldGrid>

      <div style={{ fontSize: 13, color: '#2d4a3a', margin: '10px 0' }}>
        ยอดเงิน: {grossAmount.toLocaleString()} บาท − หักค่าปุ๋ย {Number(fertilizerDeduction || 0).toLocaleString()} บาท ={' '}
        <strong>{netPayable.toLocaleString()} บาท</strong>
      </div>

      {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 8 }}>{error}</p>}

      <button type="submit" disabled={saving} style={primaryButton}>
        {saving ? 'กำลังบันทึก...' : 'ยืนยันรับเข้า & คำนวณเงิน'}
      </button>
    </form>
  )
}

function MarkPaidForm({
  payment,
  supabase,
  onSaved,
}: {
  payment: FarmerPayment
  supabase: SupabaseClient
  onSaved: (payment: FarmerPayment) => void
}) {
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0])
  const [slip, setSlip] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    let slipUrl: string | null = null
    if (slip) {
      const path = `${payment.id}/${Date.now()}-${slip.name}`
      const { error: uploadError } = await supabase.storage.from('payment-slips').upload(path, slip)
      if (uploadError) {
        setError('ไม่สามารถอัปโหลดสลิปได้')
        setSaving(false)
        return
      }
      const { data: publicUrl } = supabase.storage.from('payment-slips').getPublicUrl(path)
      slipUrl = publicUrl.publicUrl
    }

    const { data: updated, error: updateError } = await supabase
      .from('farmer_payments')
      .update({ payment_method: paymentMethod, payment_slip_url: slipUrl, status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', payment.id)
      .select()
      .single()

    setSaving(false)
    if (updateError || !updated) {
      setError('ไม่สามารถบันทึกการจ่ายเงินได้')
      return
    }
    onSaved(updated as FarmerPayment)
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ fontSize: 13, color: '#2d4a3a', marginBottom: 10 }}>บันทึกการจ่ายเงิน</h3>
      <div style={{ fontSize: 13, color: '#2d4a3a', marginBottom: 10 }}>
        ยอดที่ต้องจ่าย: <strong>{Number(payment.net_payable).toLocaleString()} บาท</strong>
      </div>
      <FieldGrid>
        <label>
          <span style={fieldLabel}>วิธีจ่ายเงิน</span>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={fieldInput}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span style={fieldLabel}>สลิปการโอนเงิน</span>
          <input type="file" accept="image/*" onChange={(e) => setSlip(e.target.files?.[0] ?? null)} style={{ fontSize: 12 }} />
        </label>
      </FieldGrid>

      {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 8 }}>{error}</p>}

      <button type="submit" disabled={saving} style={primaryButton}>
        {saving ? 'กำลังบันทึก...' : 'บันทึกว่าจ่ายแล้ว'}
      </button>
    </form>
  )
}

function PaidSummary({ payment }: { payment: FarmerPayment }) {
  return (
    <div style={{ fontSize: 13, color: '#256029' }}>
      จ่ายเงินแล้ว {Number(payment.net_payable).toLocaleString()} บาท
      {payment.payment_slip_url && (
        <>
          {' · '}
          <a href={payment.payment_slip_url} target="_blank" rel="noreferrer" style={{ color: '#2d7a3a' }}>
            ดูสลิป
          </a>
        </>
      )}
    </div>
  )
}

function ReceivingSummary({ receiving }: { receiving: CherryReceiving }) {
  return (
    <div style={{ fontSize: 13, color: '#6b8f5e' }}>
      รับเข้าแล้ว: น้ำหนักที่รับซื้อ {receiving.accepted_weight ?? '-'} กก. (เกรด {receiving.quality_grade ?? '-'})
    </div>
  )
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 10 }}>{children}</div>
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label>
      <span style={fieldLabel}>{label}</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} style={fieldInput} />
    </label>
  )
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <label>
      <span style={fieldLabel}>{label}</span>
      <input type="number" step="any" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={fieldInput} />
    </label>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={fieldLabel}>{label}</span>
      <div style={{ ...fieldInput, background: '#f5f5f5' }}>{value}</div>
    </div>
  )
}
