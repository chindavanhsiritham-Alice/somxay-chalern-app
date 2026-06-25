'use client'

import { useMemo, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import {
  BOOKING_STATUS_LABELS,
  totalOutstandingDebt,
  type BookingStatus,
  type CherryBooking,
  type CherryReceiving,
  type FarmerDebtBalance,
  type FarmerDebtLedgerEntry,
  type FarmerPayment,
} from '@/lib/farmer/types'
import type { Warehouse } from '@/lib/warehouse/types'

export type AdminBookingRow = CherryBooking & {
  farmers: { full_name: string; phone: string | null; village: string | null; farmer_debts: FarmerDebtBalance[] | FarmerDebtBalance | null } | null
  cherry_receivings: CherryReceiving[] | CherryReceiving | null
  farmer_payments: FarmerPayment[] | FarmerPayment | null
}

function toOne<T>(v: T[] | T | null | undefined): T | null {
  if (v == null) return null
  return Array.isArray(v) ? v[0] ?? null : v
}

function emptyDebt(farmerId: string): FarmerDebtBalance {
  return {
    farmer_id: farmerId,
    balance: 0,
    fertilizer_balance: 0,
    pesticide_balance: 0,
    cash_advance_balance: 0,
    other_balance: 0,
    updated_at: new Date(0).toISOString(),
  }
}

type Row = {
  booking: CherryBooking
  farmerName: string
  farmerPhone: string | null
  receiving: CherryReceiving | null
  payment: FarmerPayment | null
  debt: FarmerDebtBalance
}

function toRow(r: AdminBookingRow): Row {
  return {
    booking: r,
    farmerName: r.farmers?.full_name ?? 'ไม่ทราบชื่อ',
    farmerPhone: r.farmers?.phone ?? null,
    receiving: toOne(r.cherry_receivings),
    payment: toOne(r.farmer_payments),
    debt: toOne(r.farmers?.farmer_debts) ?? emptyDebt(r.farmer_id),
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

export default function CherryBookingsManager({
  initialBookings,
  warehouses,
}: {
  initialBookings: AdminBookingRow[]
  warehouses: Warehouse[]
}) {
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
              warehouses={warehouses}
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
  warehouses,
}: {
  row: Row
  expanded: boolean
  onToggle: () => void
  onUpdate: (patch: Partial<Row>) => void
  supabase: SupabaseClient
  warehouses: Warehouse[]
}) {
  const { booking, farmerName, farmerPhone, receiving, payment, debt } = row

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={onToggle}>
        <div>
          <div style={{ fontWeight: 700, color: '#2d4a3a' }}>
            {booking.booking_code}
            {booking.queue_number && (
              <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: '#2d7a3a', background: '#e8f5e9', padding: '2px 8px', borderRadius: 999 }}>
                {booking.queue_number}
              </span>
            )}
          </div>
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
              debt={debt}
              supabase={supabase}
              warehouses={warehouses}
              onSaved={(savedReceiving, savedPayment, newDebt) =>
                onUpdate({ receiving: savedReceiving, payment: savedPayment, debt: newDebt, booking: { ...booking, status: 'received' } })
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
  debt,
  supabase,
  warehouses,
  onSaved,
}: {
  booking: CherryBooking
  debt: FarmerDebtBalance
  supabase: SupabaseClient
  warehouses: Warehouse[]
  onSaved: (receiving: CherryReceiving, payment: FarmerPayment, newDebt: FarmerDebtBalance) => void
}) {
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? '')
  const [truckPlate, setTruckPlate] = useState('')
  const [grossWeight, setGrossWeight] = useState('')
  const [tareWeight, setTareWeight] = useState('')
  const [qualityGrade, setQualityGrade] = useState('')
  const [defectPercent, setDefectPercent] = useState('')
  const [deductionPercent, setDeductionPercent] = useState('')
  const [acceptedWeightOverride, setAcceptedWeightOverride] = useState('')
  const [fertilizerDeduction, setFertilizerDeduction] = useState(String(debt.fertilizer_balance || 0))
  const [pesticideDeduction, setPesticideDeduction] = useState(String(debt.pesticide_balance || 0))
  const [cashAdvanceDeduction, setCashAdvanceDeduction] = useState(String(debt.cash_advance_balance || 0))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const netWeight = Number(grossWeight || 0) - Number(tareWeight || 0)
  const suggestedAccepted = netWeight > 0 ? netWeight * (1 - Number(deductionPercent || 0) / 100) : 0
  const acceptedWeight = acceptedWeightOverride !== '' ? Number(acceptedWeightOverride) : suggestedAccepted
  const grossAmount = acceptedWeight * booking.price_at_booking

  // Tiered cascade: fertilizer debt first, then pesticide, then cash advance.
  // Each tier is capped by what's still owed in that category and by what's
  // left of the gross sale amount, never exceeding the admin-entered amount.
  let remaining = grossAmount
  const fertilizerApplied = Math.max(0, Math.min(Number(fertilizerDeduction) || 0, remaining, debt.fertilizer_balance))
  remaining -= fertilizerApplied
  const pesticideApplied = Math.max(0, Math.min(Number(pesticideDeduction) || 0, remaining, debt.pesticide_balance))
  remaining -= pesticideApplied
  const cashAdvanceApplied = Math.max(0, Math.min(Number(cashAdvanceDeduction) || 0, remaining, debt.cash_advance_balance))
  remaining -= cashAdvanceApplied
  const netPayable = grossAmount - fertilizerApplied - pesticideApplied - cashAdvanceApplied

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
        warehouse_id: warehouseId || null,
      })
      .select()
      .single()

    if (receivingError || !receivingRow) {
      setError('ไม่สามารถบันทึกข้อมูลรับเข้าได้')
      setSaving(false)
      return
    }

    await supabase.from('inventory_stock_movements').insert({
      material_type: 'cherry',
      movement_type: 'receive',
      reference_label: booking.booking_code,
      reference_id: receivingRow.id,
      warehouse_id: warehouseId || null,
      quantity_kg: acceptedWeight,
      note: `รับเข้าเชอร์รี่จากเกษตรกร ${booking.booking_code}`,
      created_by: userData.user?.id ?? null,
    })

    await supabase.from('cherry_bookings').update({ status: 'received' }).eq('id', booking.id)

    const { data: paymentRow, error: paymentError } = await supabase
      .from('farmer_payments')
      .insert({
        booking_id: booking.id,
        farmer_id: booking.farmer_id,
        accepted_weight: acceptedWeight,
        price_per_kg: booking.price_at_booking,
        gross_amount: grossAmount,
        fertilizer_deduction: fertilizerApplied,
        pesticide_deduction: pesticideApplied,
        cash_advance_deduction: cashAdvanceApplied,
        net_payable: netPayable,
        status: 'pending',
      })
      .select()
      .single()

    if (paymentError || !paymentRow) {
      setSaving(false)
      setError('บันทึกข้อมูลรับเข้าแล้ว แต่ไม่สามารถคำนวณเงินจ่ายได้')
      return
    }

    const newDebt: FarmerDebtBalance = {
      ...debt,
      fertilizer_balance: Math.max(0, debt.fertilizer_balance - fertilizerApplied),
      pesticide_balance: Math.max(0, debt.pesticide_balance - pesticideApplied),
      cash_advance_balance: Math.max(0, debt.cash_advance_balance - cashAdvanceApplied),
      updated_at: new Date().toISOString(),
    }
    newDebt.balance = newDebt.fertilizer_balance

    await supabase.from('farmer_debts').upsert(
      {
        farmer_id: booking.farmer_id,
        balance: newDebt.balance,
        fertilizer_balance: newDebt.fertilizer_balance,
        pesticide_balance: newDebt.pesticide_balance,
        cash_advance_balance: newDebt.cash_advance_balance,
        other_balance: newDebt.other_balance,
        updated_at: newDebt.updated_at,
      },
      { onConflict: 'farmer_id' }
    )

    const totalAfter = totalOutstandingDebt(newDebt)
    const ledgerRows: Partial<FarmerDebtLedgerEntry>[] = []
    if (fertilizerApplied > 0) {
      ledgerRows.push({
        farmer_id: booking.farmer_id,
        transaction_type: 'deduction',
        debit: 0,
        credit: fertilizerApplied,
        balance_after: totalAfter,
        note: `หักหนี้ค่าปุ๋ยจากการขายเชอร์รี่ ${booking.booking_code}`,
        created_by: userData.user?.id ?? null,
      })
    }
    if (pesticideApplied > 0) {
      ledgerRows.push({
        farmer_id: booking.farmer_id,
        transaction_type: 'deduction',
        debit: 0,
        credit: pesticideApplied,
        balance_after: totalAfter,
        note: `หักหนี้ค่ายา/สารเคมีจากการขายเชอร์รี่ ${booking.booking_code}`,
        created_by: userData.user?.id ?? null,
      })
    }
    if (cashAdvanceApplied > 0) {
      ledgerRows.push({
        farmer_id: booking.farmer_id,
        transaction_type: 'deduction',
        debit: 0,
        credit: cashAdvanceApplied,
        balance_after: totalAfter,
        note: `หักเงินเบิกล่วงหน้าจากการขายเชอร์รี่ ${booking.booking_code}`,
        created_by: userData.user?.id ?? null,
      })
    }
    ledgerRows.push({
      farmer_id: booking.farmer_id,
      transaction_type: 'cherry_sale',
      debit: 0,
      credit: 0,
      balance_after: totalAfter,
      note: `ขายเชอร์รี่ ${booking.booking_code} มูลค่า ${grossAmount.toLocaleString()} บาท`,
      created_by: userData.user?.id ?? null,
    })
    await supabase.from('farmer_debt_ledger').insert(ledgerRows)

    setSaving(false)
    onSaved(receivingRow as CherryReceiving, paymentRow as FarmerPayment, newDebt)
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ fontSize: 13, color: '#2d4a3a', marginBottom: 10 }}>ยืนยันรับเข้า &amp; คำนวณเงิน</h3>
      <FieldGrid>
        <label>
          <span style={fieldLabel}>คลังที่รับเข้า</span>
          <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} style={fieldInput}>
            <option value="">— ไม่ระบุ —</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        <TextField label="ทะเบียนรถ" value={truckPlate} onChange={setTruckPlate} />
        <NumberField label="น้ำหนักรวม (กก.)" value={grossWeight} onChange={setGrossWeight} />
        <NumberField label="น้ำหนักรถเปล่า (กก.)" value={tareWeight} onChange={setTareWeight} />
        <ReadOnlyField label="น้ำหนักสุทธิ (กก.)" value={netWeight.toFixed(2)} />
        <TextField label="เกรดคุณภาพ" value={qualityGrade} onChange={setQualityGrade} />
        <NumberField label="% ตำหนิ" value={defectPercent} onChange={setDefectPercent} />
        <NumberField label="% หัก" value={deductionPercent} onChange={setDeductionPercent} />
        <NumberField label="น้ำหนักที่รับซื้อ (กก.)" value={acceptedWeightOverride} onChange={setAcceptedWeightOverride} placeholder={suggestedAccepted.toFixed(2)} />
        <NumberField label="หักค่าปุ๋ย (บาท)" value={fertilizerDeduction} onChange={setFertilizerDeduction} />
        <NumberField label="หักค่ายา/สารเคมี (บาท)" value={pesticideDeduction} onChange={setPesticideDeduction} />
        <NumberField label="หักเงินเบิกล่วงหน้า (บาท)" value={cashAdvanceDeduction} onChange={setCashAdvanceDeduction} />
      </FieldGrid>

      <div style={{ fontSize: 13, color: '#2d4a3a', margin: '10px 0' }}>
        ยอดเงิน: {grossAmount.toLocaleString()} บาท − หักค่าปุ๋ย {fertilizerApplied.toLocaleString()} − หักค่ายา {pesticideApplied.toLocaleString()} − หักเงินเบิก{' '}
        {cashAdvanceApplied.toLocaleString()} บาท = <strong>{netPayable.toLocaleString()} บาท</strong>
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

    if (updateError || !updated) {
      setSaving(false)
      setError('ไม่สามารถบันทึกการจ่ายเงินได้')
      return
    }

    const { data: userData } = await supabase.auth.getUser()
    const { data: debtRow } = await supabase
      .from('farmer_debts')
      .select('fertilizer_balance, pesticide_balance, cash_advance_balance, other_balance')
      .eq('farmer_id', payment.farmer_id)
      .maybeSingle()
    const totalDebt =
      Number(debtRow?.fertilizer_balance ?? 0) +
      Number(debtRow?.pesticide_balance ?? 0) +
      Number(debtRow?.cash_advance_balance ?? 0) +
      Number(debtRow?.other_balance ?? 0)

    await supabase.from('farmer_debt_ledger').insert({
      farmer_id: payment.farmer_id,
      transaction_type: 'payment',
      debit: 0,
      credit: 0,
      balance_after: totalDebt,
      note: `จ่ายเงินสุทธิ ${Number(payment.net_payable).toLocaleString()} บาท ผ่าน ${paymentMethod}`,
      created_by: userData.user?.id ?? null,
    })

    setSaving(false)
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
      <div>
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
      <div style={{ fontSize: 12, color: '#6b8f5e', marginTop: 4 }}>
        ยอดขาย {Number(payment.gross_amount).toLocaleString()} บาท
        {Number(payment.fertilizer_deduction) > 0 && ` · หักค่าปุ๋ย ${Number(payment.fertilizer_deduction).toLocaleString()}`}
        {Number(payment.pesticide_deduction) > 0 && ` · หักค่ายา ${Number(payment.pesticide_deduction).toLocaleString()}`}
        {Number(payment.cash_advance_deduction) > 0 && ` · หักเงินเบิก ${Number(payment.cash_advance_deduction).toLocaleString()}`}
      </div>
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
