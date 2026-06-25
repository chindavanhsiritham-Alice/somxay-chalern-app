'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { generateLotCode, type ParchmentLot, type Warehouse } from '@/lib/warehouse/types'

const fieldLabel: React.CSSProperties = { fontSize: 11, color: '#6b8f5e', marginBottom: 4, display: 'block' }
const fieldInput: React.CSSProperties = { width: '100%', padding: '6px 8px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }
const primaryButton: React.CSSProperties = { background: '#2d7a3a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const th: React.CSSProperties = { padding: '10px 14px', fontWeight: 600, color: '#2d4a3a' }
const td: React.CSSProperties = { padding: '10px 14px', color: '#444' }

export default function ParchmentInventoryManager({
  initialLots,
  warehouses,
}: {
  initialLots: ParchmentLot[]
  warehouses: Warehouse[]
}) {
  const supabase = createClient()
  const [lots, setLots] = useState<ParchmentLot[]>(initialLots)

  const totalRemaining = lots.reduce((s, l) => s + Number(l.remaining_kg), 0)
  const warehouseName = (id: string | null) => warehouses.find((w) => w.id === id)?.name ?? '-'

  return (
    <div>
      <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>คลังกะลา (พาร์ชเมนต์)</h1>
      <p style={{ color: '#6b8f5e', marginBottom: 20 }}>แปรรูปเชอร์รี่เป็นกะลา บันทึก % ผลผลิต และติดตามยอดคงเหลือ</p>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 24 }}>
        <ReportCard label="คงเหลือรวม" value={`${totalRemaining.toLocaleString()} กก.`} />
        <ReportCard label="จำนวนล็อตทั้งหมด" value={String(lots.length)} />
      </div>

      <CreateLotForm
        supabase={supabase}
        warehouses={warehouses}
        onCreated={(lot) => setLots((list) => [lot, ...list])}
      />

      <h2 style={{ fontSize: 16, color: '#2d4a3a', margin: '24px 0 10px' }}>ล็อตกะลา</h2>
      {lots.length === 0 ? (
        <p style={{ color: '#999' }}>ยังไม่มีล็อตกะลา</p>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f7f2', textAlign: 'left' }}>
                <th style={th}>เลขล็อต</th>
                <th style={th}>เชอร์รี่ต้นทาง (กก.)</th>
                <th style={th}>กะลาที่ได้ (กก.)</th>
                <th style={th}>% ผลผลิต</th>
                <th style={th}>คงเหลือ (กก.)</th>
                <th style={th}>คลัง</th>
                <th style={th}>วันที่</th>
              </tr>
            </thead>
            <tbody>
              {lots.map((l) => (
                <tr key={l.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>{l.lot_code}</td>
                  <td style={td}>{Number(l.source_cherry_kg).toLocaleString()}</td>
                  <td style={td}>{Number(l.parchment_kg).toLocaleString()}</td>
                  <td style={td}>{Number(l.yield_percent).toFixed(1)}%</td>
                  <td style={td}>{Number(l.remaining_kg).toLocaleString()}</td>
                  <td style={td}>{warehouseName(l.warehouse_id)}</td>
                  <td style={td}>{new Date(l.created_at).toLocaleDateString('th-TH')}</td>
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
  onCreated,
}: {
  supabase: ReturnType<typeof createClient>
  warehouses: Warehouse[]
  onCreated: (lot: ParchmentLot) => void
}) {
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? '')
  const [sourceCherryKg, setSourceCherryKg] = useState('')
  const [parchmentKg, setParchmentKg] = useState('')
  const [process, setProcess] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const yieldPercent = Number(sourceCherryKg) > 0 ? (Number(parchmentKg) / Number(sourceCherryKg)) * 100 : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const cherryKg = Number(sourceCherryKg)
    const outputKg = Number(parchmentKg)
    if (!Number.isFinite(cherryKg) || cherryKg <= 0 || !Number.isFinite(outputKg) || outputKg <= 0) {
      setError('กรุณากรอกปริมาณให้ถูกต้อง')
      return
    }
    setSaving(true)

    const { data: userData } = await supabase.auth.getUser()
    const lotCode = generateLotCode('PCH')

    const { data: lotRow, error: lotError } = await supabase
      .from('parchment_lots')
      .insert({
        lot_code: lotCode,
        source_cherry_kg: cherryKg,
        parchment_kg: outputKg,
        remaining_kg: outputKg,
        yield_percent: yieldPercent,
        process: process || null,
        warehouse_id: warehouseId || null,
        note: note || null,
        created_by: userData.user?.id ?? null,
      })
      .select()
      .single()

    if (lotError || !lotRow) {
      setError('ไม่สามารถสร้างล็อตกะลาได้')
      setSaving(false)
      return
    }

    await supabase.from('inventory_stock_movements').insert([
      {
        material_type: 'cherry',
        movement_type: 'process',
        reference_id: lotRow.id,
        reference_label: lotCode,
        warehouse_id: warehouseId || null,
        quantity_kg: -cherryKg,
        note: `แปรรูปเป็นกะลาล็อต ${lotCode}`,
        created_by: userData.user?.id ?? null,
      },
      {
        material_type: 'parchment',
        movement_type: 'process',
        reference_id: lotRow.id,
        reference_label: lotCode,
        warehouse_id: warehouseId || null,
        quantity_kg: outputKg,
        note: `ผลผลิตจากการแปรรูปเชอร์รี่ ${cherryKg.toLocaleString()} กก.`,
        created_by: userData.user?.id ?? null,
      },
    ])

    setSaving(false)
    setSourceCherryKg('')
    setParchmentKg('')
    setProcess('')
    setNote('')
    onCreated(lotRow as ParchmentLot)
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <h3 style={{ fontSize: 13, color: '#2d4a3a', marginBottom: 10 }}>สร้างล็อตกะลาจากการแปรรูปเชอร์รี่</h3>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 10 }}>
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
          <span style={fieldLabel}>เชอร์รี่ที่ใช้ (กก.)</span>
          <input type="number" step="any" value={sourceCherryKg} onChange={(e) => setSourceCherryKg(e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>กะลาที่ได้ (กก.)</span>
          <input type="number" step="any" value={parchmentKg} onChange={(e) => setParchmentKg(e.target.value)} style={fieldInput} />
        </label>
        <div>
          <span style={fieldLabel}>% ผลผลิต</span>
          <div style={{ ...fieldInput, background: '#f5f5f5' }}>{yieldPercent.toFixed(1)}%</div>
        </div>
        <label>
          <span style={fieldLabel}>กระบวนการ</span>
          <input type="text" value={process} onChange={(e) => setProcess(e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>หมายเหตุ</span>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} style={fieldInput} />
        </label>
      </div>

      {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 8 }}>{error}</p>}

      <button type="submit" disabled={saving} style={primaryButton}>
        {saving ? 'กำลังบันทึก...' : 'สร้างล็อตกะลา'}
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
