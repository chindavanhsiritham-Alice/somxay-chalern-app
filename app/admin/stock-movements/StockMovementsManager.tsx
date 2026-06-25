'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  MATERIAL_TYPE_LABELS,
  MOVEMENT_TYPE_LABELS,
  type MaterialType,
  type MovementType,
  type StockMovement,
  type Warehouse,
} from '@/lib/warehouse/types'

const fieldLabel: React.CSSProperties = { fontSize: 11, color: '#6b8f5e', marginBottom: 4, display: 'block' }
const fieldInput: React.CSSProperties = { width: '100%', padding: '6px 8px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }
const primaryButton: React.CSSProperties = { background: '#2d7a3a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const th: React.CSSProperties = { padding: '10px 14px', fontWeight: 600, color: '#2d4a3a' }
const td: React.CSSProperties = { padding: '10px 14px', color: '#444' }
const card: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }

const MATERIAL_TYPES = Object.keys(MATERIAL_TYPE_LABELS) as MaterialType[]
const MOVEMENT_TYPES = Object.keys(MOVEMENT_TYPE_LABELS) as MovementType[]

export default function StockMovementsManager({
  warehouses,
  initialMovements,
}: {
  warehouses: Warehouse[]
  initialMovements: StockMovement[]
}) {
  const supabase = createClient()
  const [movements, setMovements] = useState<StockMovement[]>(initialMovements)
  const [materialFilter, setMaterialFilter] = useState<MaterialType | ''>('')
  const [movementFilter, setMovementFilter] = useState<MovementType | ''>('')

  const warehouseName = (id: string | null) => warehouses.find((w) => w.id === id)?.name ?? '-'

  const filtered = useMemo(
    () =>
      movements.filter(
        (m) => (materialFilter === '' || m.material_type === materialFilter) && (movementFilter === '' || m.movement_type === movementFilter)
      ),
    [movements, materialFilter, movementFilter]
  )

  return (
    <div>
      <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>การเคลื่อนไหวสต็อก</h1>
      <p style={{ color: '#6b8f5e', marginBottom: 20 }}>รับเข้า / โอนย้าย / แปรรูป / ปรับปรุงยอด / ส่งออก / ขาย — ทุกประเภทวัตถุดิบ</p>

      <MovementForm
        supabase={supabase}
        warehouses={warehouses}
        onCreated={(rows) => setMovements((list) => [...rows, ...list])}
      />

      <h2 style={{ fontSize: 16, color: '#2d4a3a', margin: '24px 0 10px' }}>ประวัติการเคลื่อนไหว</h2>

      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <select value={materialFilter} onChange={(e) => setMaterialFilter(e.target.value as MaterialType | '')} style={{ ...fieldInput, width: 220 }}>
          <option value="">ทุกประเภทวัตถุดิบ</option>
          {MATERIAL_TYPES.map((m) => (
            <option key={m} value={m}>
              {MATERIAL_TYPE_LABELS[m]}
            </option>
          ))}
        </select>
        <select value={movementFilter} onChange={(e) => setMovementFilter(e.target.value as MovementType | '')} style={{ ...fieldInput, width: 220 }}>
          <option value="">ทุกประเภทการเคลื่อนไหว</option>
          {MOVEMENT_TYPES.map((m) => (
            <option key={m} value={m}>
              {MOVEMENT_TYPE_LABELS[m]}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: '#999' }}>ไม่พบรายการ</p>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f7f2', textAlign: 'left' }}>
                <th style={th}>วันที่</th>
                <th style={th}>วัตถุดิบ</th>
                <th style={th}>ประเภท</th>
                <th style={th}>คลัง</th>
                <th style={th}>คลังปลายทาง</th>
                <th style={th}>ปริมาณ</th>
                <th style={th}>อ้างอิง</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>{new Date(m.created_at).toLocaleString('th-TH')}</td>
                  <td style={td}>{MATERIAL_TYPE_LABELS[m.material_type]}</td>
                  <td style={td}>{MOVEMENT_TYPE_LABELS[m.movement_type]}</td>
                  <td style={td}>{warehouseName(m.warehouse_id)}</td>
                  <td style={td}>{warehouseName(m.related_warehouse_id)}</td>
                  <td style={{ ...td, color: Number(m.quantity_kg) < 0 ? '#c0392b' : '#256029' }}>
                    {Number(m.quantity_kg) > 0 ? '+' : ''}
                    {Number(m.quantity_kg).toLocaleString()}
                  </td>
                  <td style={td}>{m.reference_label ?? m.note ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function MovementForm({
  supabase,
  warehouses,
  onCreated,
}: {
  supabase: ReturnType<typeof createClient>
  warehouses: Warehouse[]
  onCreated: (rows: StockMovement[]) => void
}) {
  const [materialType, setMaterialType] = useState<MaterialType>('cherry')
  const [movementType, setMovementType] = useState<MovementType>('receive')
  const [direction, setDirection] = useState<'in' | 'out'>('in')
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? '')
  const [relatedWarehouseId, setRelatedWarehouseId] = useState('')
  const [amount, setAmount] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [referenceLabel, setReferenceLabel] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isTransfer = movementType === 'transfer'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const qty = Number(amount)
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('กรุณากรอกปริมาณให้ถูกต้อง')
      return
    }
    if (isTransfer && (!warehouseId || !relatedWarehouseId || warehouseId === relatedWarehouseId)) {
      setError('กรุณาเลือกคลังต้นทางและปลายทางให้ถูกต้อง')
      return
    }
    setSaving(true)

    const { data: userData } = await supabase.auth.getUser()
    const baseRow = {
      material_type: materialType,
      movement_type: movementType,
      reference_label: referenceLabel || null,
      unit_cost: unitCost === '' ? null : Number(unitCost),
      note: note || null,
      created_by: userData.user?.id ?? null,
    }

    const rowsToInsert: ((typeof baseRow) & { warehouse_id: string | null; related_warehouse_id: string | null; quantity_kg: number })[] = isTransfer
      ? [
          { ...baseRow, warehouse_id: warehouseId, related_warehouse_id: relatedWarehouseId, quantity_kg: -qty },
          { ...baseRow, warehouse_id: relatedWarehouseId, related_warehouse_id: warehouseId, quantity_kg: qty },
        ]
      : [{ ...baseRow, warehouse_id: warehouseId || null, related_warehouse_id: null, quantity_kg: direction === 'in' ? qty : -qty }]

    const { data: insertedRows, error: insertError } = await supabase.from('inventory_stock_movements').insert(rowsToInsert).select()

    if (insertError || !insertedRows) {
      setError('ไม่สามารถบันทึกการเคลื่อนไหวได้')
      setSaving(false)
      return
    }

    setSaving(false)
    setAmount('')
    setReferenceLabel('')
    setNote('')
    setUnitCost('')
    onCreated(insertedRows as StockMovement[])
  }

  return (
    <form onSubmit={handleSubmit} style={card}>
      <h3 style={{ fontSize: 13, color: '#2d4a3a', marginBottom: 10 }}>บันทึกการเคลื่อนไหวสต็อก</h3>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 10 }}>
        <label>
          <span style={fieldLabel}>วัตถุดิบ</span>
          <select value={materialType} onChange={(e) => setMaterialType(e.target.value as MaterialType)} style={fieldInput}>
            {MATERIAL_TYPES.map((m) => (
              <option key={m} value={m}>
                {MATERIAL_TYPE_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span style={fieldLabel}>ประเภทการเคลื่อนไหว</span>
          <select value={movementType} onChange={(e) => setMovementType(e.target.value as MovementType)} style={fieldInput}>
            {MOVEMENT_TYPES.map((m) => (
              <option key={m} value={m}>
                {MOVEMENT_TYPE_LABELS[m]}
              </option>
            ))}
          </select>
        </label>

        {isTransfer ? (
          <>
            <label>
              <span style={fieldLabel}>คลังต้นทาง</span>
              <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} style={fieldInput}>
                <option value="">— เลือกคลัง —</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span style={fieldLabel}>คลังปลายทาง</span>
              <select value={relatedWarehouseId} onChange={(e) => setRelatedWarehouseId(e.target.value)} style={fieldInput}>
                <option value="">— เลือกคลัง —</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <>
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
              <span style={fieldLabel}>ทิศทาง</span>
              <select value={direction} onChange={(e) => setDirection(e.target.value as 'in' | 'out')} style={fieldInput}>
                <option value="in">เพิ่มสต็อก</option>
                <option value="out">ลดสต็อก</option>
              </select>
            </label>
          </>
        )}

        <label>
          <span style={fieldLabel}>ปริมาณ (กก.)</span>
          <input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>ต้นทุนต่อกก. (ถ้ามี)</span>
          <input type="number" step="any" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>เลขอ้างอิง</span>
          <input type="text" value={referenceLabel} onChange={(e) => setReferenceLabel(e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>หมายเหตุ</span>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} style={fieldInput} />
        </label>
      </div>

      {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 8 }}>{error}</p>}

      <button type="submit" disabled={saving} style={primaryButton}>
        {saving ? 'กำลังบันทึก...' : 'บันทึกการเคลื่อนไหว'}
      </button>
    </form>
  )
}
