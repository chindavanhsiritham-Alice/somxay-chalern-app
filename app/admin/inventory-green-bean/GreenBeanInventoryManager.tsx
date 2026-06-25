'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { generateLotCode, type GreenBeanLot, type ParchmentLot, type Warehouse } from '@/lib/warehouse/types'

const fieldLabel: React.CSSProperties = { fontSize: 11, color: '#6b8f5e', marginBottom: 4, display: 'block' }
const fieldInput: React.CSSProperties = { width: '100%', padding: '6px 8px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }
const primaryButton: React.CSSProperties = { background: '#2d7a3a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const th: React.CSSProperties = { padding: '10px 14px', fontWeight: 600, color: '#2d4a3a' }
const td: React.CSSProperties = { padding: '10px 14px', color: '#444' }

export default function GreenBeanInventoryManager({
  initialLots,
  warehouses,
  parchmentLots,
}: {
  initialLots: GreenBeanLot[]
  warehouses: Warehouse[]
  parchmentLots: ParchmentLot[]
}) {
  const supabase = createClient()
  const [lots, setLots] = useState<GreenBeanLot[]>(initialLots)
  const [availableParchment, setAvailableParchment] = useState<ParchmentLot[]>(parchmentLots)

  const totalStock = lots.reduce((s, l) => s + Number(l.stock_quantity), 0)
  const totalAvailable = lots.reduce((s, l) => s + Number(l.available_quantity), 0)
  const warehouseName = (id: string | null) => warehouses.find((w) => w.id === id)?.name ?? '-'

  return (
    <div>
      <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>คลังสารกาแฟ (กรีนบีน)</h1>
      <p style={{ color: '#6b8f5e', marginBottom: 20 }}>ล็อตสารกาแฟ พันธุ์ กระบวนการ เกรด คลัง สต็อก และยอดที่จองไว้</p>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 24 }}>
        <ReportCard label="สต็อกรวม" value={`${totalStock.toLocaleString()} กก.`} />
        <ReportCard label="พร้อมขายรวม" value={`${totalAvailable.toLocaleString()} กก.`} />
        <ReportCard label="จำนวนล็อต" value={String(lots.length)} />
      </div>

      <CreateLotForm
        supabase={supabase}
        warehouses={warehouses}
        parchmentLots={availableParchment}
        onCreated={(lot, consumedParchmentId, remainingAfter) => {
          setLots((list) => [lot, ...list])
          if (consumedParchmentId != null) {
            setAvailableParchment((list) =>
              list
                .map((p) => (p.id === consumedParchmentId ? { ...p, remaining_kg: remainingAfter } : p))
                .filter((p) => p.remaining_kg > 0)
            )
          }
        }}
      />

      <h2 style={{ fontSize: 16, color: '#2d4a3a', margin: '24px 0 10px' }}>ล็อตสารกาแฟ</h2>
      {lots.length === 0 ? (
        <p style={{ color: '#999' }}>ยังไม่มีล็อตสารกาแฟ</p>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f7f2', textAlign: 'left' }}>
                <th style={th}>เลขล็อต</th>
                <th style={th}>พันธุ์</th>
                <th style={th}>กระบวนการ</th>
                <th style={th}>เกรด</th>
                <th style={th}>คลัง</th>
                <th style={th}>สต็อก (กก.)</th>
                <th style={th}>จองไว้ (กก.)</th>
                <th style={th}>พร้อมขาย (กก.)</th>
              </tr>
            </thead>
            <tbody>
              {lots.map((l) => (
                <tr key={l.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>{l.lot_number}</td>
                  <td style={td}>{l.variety ?? '-'}</td>
                  <td style={td}>{l.process ?? '-'}</td>
                  <td style={td}>{l.grade ?? '-'}</td>
                  <td style={td}>{warehouseName(l.warehouse_id)}</td>
                  <td style={td}>{Number(l.stock_quantity).toLocaleString()}</td>
                  <td style={td}>{Number(l.reserved_quantity).toLocaleString()}</td>
                  <td style={td}>{Number(l.available_quantity).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CreateLotForm({
  supabase,
  warehouses,
  parchmentLots,
  onCreated,
}: {
  supabase: ReturnType<typeof createClient>
  warehouses: Warehouse[]
  parchmentLots: ParchmentLot[]
  onCreated: (lot: GreenBeanLot, consumedParchmentId: string | null, remainingAfter: number) => void
}) {
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? '')
  const [sourceParchmentLotId, setSourceParchmentLotId] = useState('')
  const [variety, setVariety] = useState('')
  const [process, setProcess] = useState('')
  const [grade, setGrade] = useState('')
  const [stockQuantity, setStockQuantity] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const sourceLot = parchmentLots.find((p) => p.id === sourceParchmentLotId) ?? null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const qty = Number(stockQuantity)
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('กรุณากรอกปริมาณให้ถูกต้อง')
      return
    }
    if (sourceLot && qty > Number(sourceLot.remaining_kg)) {
      setError('ปริมาณเกินกว่ากะลาคงเหลือในล็อตที่เลือก')
      return
    }
    setSaving(true)

    const { data: userData } = await supabase.auth.getUser()
    const lotNumber = generateLotCode('GB')

    const { data: lotRow, error: lotError } = await supabase
      .from('green_bean_lots')
      .insert({
        lot_number: lotNumber,
        variety: variety || null,
        process: process || null,
        grade: grade || null,
        warehouse_id: warehouseId || null,
        source_parchment_lot_id: sourceParchmentLotId || null,
        stock_quantity: qty,
        reserved_quantity: 0,
        unit_cost: unitCost === '' ? null : Number(unitCost),
        created_by: userData.user?.id ?? null,
      })
      .select()
      .single()

    if (lotError || !lotRow) {
      setError('ไม่สามารถสร้างล็อตสารกาแฟได้')
      setSaving(false)
      return
    }

    let remainingAfter = 0
    if (sourceLot) {
      remainingAfter = Number(sourceLot.remaining_kg) - qty
      await supabase.from('parchment_lots').update({ remaining_kg: remainingAfter }).eq('id', sourceLot.id)
    }

    const movements = [
      {
        material_type: 'green_bean',
        movement_type: 'process',
        reference_id: lotRow.id,
        reference_label: lotNumber,
        warehouse_id: warehouseId || null,
        quantity_kg: qty,
        note: sourceLot ? `แปรรูปจากกะลาล็อต ${sourceLot.lot_code}` : 'สร้างล็อตสารกาแฟ',
        created_by: userData.user?.id ?? null,
      },
    ]
    if (sourceLot) {
      movements.push({
        material_type: 'parchment',
        movement_type: 'process',
        reference_id: sourceLot.id,
        reference_label: sourceLot.lot_code,
        warehouse_id: warehouseId || null,
        quantity_kg: -qty,
        note: `แปรรูปเป็นสารกาแฟล็อต ${lotNumber}`,
        created_by: userData.user?.id ?? null,
      })
    }
    await supabase.from('inventory_stock_movements').insert(movements)

    setSaving(false)
    setStockQuantity('')
    setVariety('')
    setProcess('')
    setGrade('')
    setUnitCost('')
    setSourceParchmentLotId('')
    onCreated(lotRow as GreenBeanLot, sourceLot?.id ?? null, remainingAfter)
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <h3 style={{ fontSize: 13, color: '#2d4a3a', marginBottom: 10 }}>สร้างล็อตสารกาแฟ</h3>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 10 }}>
        <label>
          <span style={fieldLabel}>กะลาต้นทาง (ถ้ามี)</span>
          <select value={sourceParchmentLotId} onChange={(e) => setSourceParchmentLotId(e.target.value)} style={fieldInput}>
            <option value="">— ไม่ระบุ —</option>
            {parchmentLots.map((p) => (
              <option key={p.id} value={p.id}>
                {p.lot_code} (คงเหลือ {Number(p.remaining_kg).toLocaleString()} กก.)
              </option>
            ))}
          </select>
        </label>
        <label>
          <span style={fieldLabel}>คลัง</span>
          <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} style={fieldInput}>
            <option value="">— ไม่ระบุ —</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span style={fieldLabel}>พันธุ์</span>
          <input type="text" value={variety} onChange={(e) => setVariety(e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>กระบวนการ</span>
          <input type="text" value={process} onChange={(e) => setProcess(e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>เกรด</span>
          <input type="text" value={grade} onChange={(e) => setGrade(e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>ปริมาณ (กก.)</span>
          <input type="number" step="any" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>ต้นทุนต่อกก.</span>
          <input type="number" step="any" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} style={fieldInput} />
        </label>
      </div>

      {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 8 }}>{error}</p>}

      <button type="submit" disabled={saving} style={primaryButton}>
        {saving ? 'กำลังบันทึก...' : 'สร้างล็อตสารกาแฟ'}
      </button>
    </form>
  )
}

function ReportCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 12, color: '#6b8f5e', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#2d4a3a' }}>{value}</div>
    </div>
  )
}
