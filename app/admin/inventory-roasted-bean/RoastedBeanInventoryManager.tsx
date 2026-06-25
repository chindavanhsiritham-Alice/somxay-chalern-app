'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  generateLotCode,
  roastYieldPercent,
  type FinishedGoodsStock,
  type GreenBeanLot,
  type PackagingMaterial,
  type RoastingBatch,
  type Warehouse,
} from '@/lib/warehouse/types'

const fieldLabel: React.CSSProperties = { fontSize: 11, color: '#6b8f5e', marginBottom: 4, display: 'block' }
const fieldInput: React.CSSProperties = { width: '100%', padding: '6px 8px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }
const primaryButton: React.CSSProperties = { background: '#2d7a3a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const th: React.CSSProperties = { padding: '10px 14px', fontWeight: 600, color: '#2d4a3a' }
const td: React.CSSProperties = { padding: '10px 14px', color: '#444' }
const card: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const tableWrap: React.CSSProperties = { background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }

export default function RoastedBeanInventoryManager({
  warehouses,
  greenBeanLots,
  initialBatches,
  initialFinishedGoods,
  initialPackaging,
  roastedStockByWarehouse,
}: {
  warehouses: Warehouse[]
  greenBeanLots: GreenBeanLot[]
  initialBatches: RoastingBatch[]
  initialFinishedGoods: FinishedGoodsStock[]
  initialPackaging: PackagingMaterial[]
  roastedStockByWarehouse: Record<string, number>
}) {
  const supabase = createClient()
  const [batches, setBatches] = useState<RoastingBatch[]>(initialBatches)
  const [availableGreenBean, setAvailableGreenBean] = useState<GreenBeanLot[]>(greenBeanLots)
  const [finishedGoods, setFinishedGoods] = useState<FinishedGoodsStock[]>(initialFinishedGoods)
  const [packaging, setPackaging] = useState<PackagingMaterial[]>(initialPackaging)
  const [roastedStock, setRoastedStock] = useState(roastedStockByWarehouse)

  const warehouseName = (id: string | null) => warehouses.find((w) => w.id === id)?.name ?? '-'
  const totalRoasted = Object.values(roastedStock).reduce((s, v) => s + v, 0)
  const totalFinished = finishedGoods.reduce((s, f) => s + Number(f.stock_quantity), 0)

  return (
    <div>
      <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>คลังกาแฟคั่ว</h1>
      <p style={{ color: '#6b8f5e', marginBottom: 20 }}>บันทึกการคั่ว สินค้าสำเร็จรูป และวัสดุบรรจุภัณฑ์</p>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 24 }}>
        <ReportCard label="กาแฟคั่วคงเหลือ" value={`${totalRoasted.toLocaleString()} กก.`} />
        <ReportCard label="สินค้าสำเร็จรูปคงเหลือ" value={String(totalFinished.toLocaleString())} />
        <ReportCard label="จำนวนรอบคั่ว" value={String(batches.length)} />
      </div>

      <h2 style={{ fontSize: 16, color: '#2d4a3a', marginBottom: 10 }}>บันทึกการคั่ว</h2>
      <RoastingBatchForm
        supabase={supabase}
        warehouses={warehouses}
        greenBeanLots={availableGreenBean}
        onCreated={(batch, lotId, newAvailable) => {
          setBatches((list) => [batch, ...list])
          setAvailableGreenBean((list) =>
            list.map((l) => (l.id === lotId ? { ...l, stock_quantity: l.stock_quantity - batch.green_bean_kg_used, available_quantity: newAvailable } : l)).filter((l) => l.available_quantity > 0)
          )
          setRoastedStock((prev) => ({ ...prev, [batch.warehouse_id ?? 'unassigned']: (prev[batch.warehouse_id ?? 'unassigned'] ?? 0) + batch.roasted_kg_output }))
        }}
      />

      {batches.length > 0 && (
        <div style={{ ...tableWrap, marginTop: 16, marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f7f2', textAlign: 'left' }}>
                <th style={th}>เลขรอบคั่ว</th>
                <th style={th}>สารกาแฟที่ใช้ (กก.)</th>
                <th style={th}>กาแฟคั่วที่ได้ (กก.)</th>
                <th style={th}>% ผลผลิต</th>
                <th style={th}>ระดับการคั่ว</th>
                <th style={th}>คลัง</th>
                <th style={th}>วันที่</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>{b.batch_code}</td>
                  <td style={td}>{Number(b.green_bean_kg_used).toLocaleString()}</td>
                  <td style={td}>{Number(b.roasted_kg_output).toLocaleString()}</td>
                  <td style={td}>{roastYieldPercent(Number(b.green_bean_kg_used), Number(b.roasted_kg_output)).toFixed(1)}%</td>
                  <td style={td}>{b.roast_level ?? '-'}</td>
                  <td style={td}>{warehouseName(b.warehouse_id)}</td>
                  <td style={td}>{new Date(b.created_at).toLocaleDateString('th-TH')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={{ fontSize: 16, color: '#2d4a3a', marginBottom: 10 }}>สินค้าสำเร็จรูป</h2>
      <FinishedGoodsForm
        supabase={supabase}
        warehouses={warehouses}
        batches={batches}
        roastedStock={roastedStock}
        onCreated={(row, warehouseKey, usedKg) => {
          setFinishedGoods((list) => [row, ...list])
          setRoastedStock((prev) => ({ ...prev, [warehouseKey]: (prev[warehouseKey] ?? 0) - usedKg }))
        }}
      />

      {finishedGoods.length > 0 && (
        <div style={{ ...tableWrap, marginTop: 16, marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f7f2', textAlign: 'left' }}>
                <th style={th}>สินค้า</th>
                <th style={th}>ขนาดบรรจุ</th>
                <th style={th}>คลัง</th>
                <th style={th}>คงเหลือ</th>
              </tr>
            </thead>
            <tbody>
              {finishedGoods.map((f) => (
                <tr key={f.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>{f.product_name}</td>
                  <td style={td}>{f.package_size ?? '-'}</td>
                  <td style={td}>{warehouseName(f.warehouse_id)}</td>
                  <td style={td}>{Number(f.stock_quantity).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={{ fontSize: 16, color: '#2d4a3a', marginBottom: 10 }}>วัสดุบรรจุภัณฑ์</h2>
      <PackagingForm supabase={supabase} warehouses={warehouses} onCreated={(row) => setPackaging((list) => [row, ...list])} />

      {packaging.length > 0 && (
        <div style={{ ...tableWrap, marginTop: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f7f2', textAlign: 'left' }}>
                <th style={th}>ชื่อ</th>
                <th style={th}>หน่วย</th>
                <th style={th}>คลัง</th>
                <th style={th}>คงเหลือ</th>
                <th style={th}>จุดสั่งซื้อ</th>
              </tr>
            </thead>
            <tbody>
              {packaging.map((p) => (
                <tr key={p.id} style={{ borderTop: '1px solid #eee', background: p.stock_quantity <= p.reorder_threshold ? '#fdf0f0' : 'transparent' }}>
                  <td style={td}>{p.name}</td>
                  <td style={td}>{p.unit}</td>
                  <td style={td}>{warehouseName(p.warehouse_id)}</td>
                  <td style={td}>{Number(p.stock_quantity).toLocaleString()}</td>
                  <td style={td}>{Number(p.reorder_threshold).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function RoastingBatchForm({
  supabase,
  warehouses,
  greenBeanLots,
  onCreated,
}: {
  supabase: ReturnType<typeof createClient>
  warehouses: Warehouse[]
  greenBeanLots: GreenBeanLot[]
  onCreated: (batch: RoastingBatch, greenBeanLotId: string, newAvailable: number) => void
}) {
  const [greenBeanLotId, setGreenBeanLotId] = useState('')
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? '')
  const [kgUsed, setKgUsed] = useState('')
  const [kgOutput, setKgOutput] = useState('')
  const [roastLevel, setRoastLevel] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const sourceLot = greenBeanLots.find((l) => l.id === greenBeanLotId) ?? null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const used = Number(kgUsed)
    const output = Number(kgOutput)
    if (!sourceLot) {
      setError('กรุณาเลือกล็อตสารกาแฟ')
      return
    }
    if (!Number.isFinite(used) || used <= 0 || !Number.isFinite(output) || output <= 0) {
      setError('กรุณากรอกปริมาณให้ถูกต้อง')
      return
    }
    if (used > Number(sourceLot.available_quantity)) {
      setError('ปริมาณเกินกว่าสารกาแฟที่พร้อมใช้ในล็อตนี้')
      return
    }
    setSaving(true)

    const { data: userData } = await supabase.auth.getUser()
    const batchCode = generateLotCode('RB')

    const { data: batchRow, error: batchError } = await supabase
      .from('roasting_batches')
      .insert({
        batch_code: batchCode,
        green_bean_lot_id: sourceLot.id,
        green_bean_kg_used: used,
        roasted_kg_output: output,
        roast_level: roastLevel || null,
        warehouse_id: warehouseId || null,
        created_by: userData.user?.id ?? null,
      })
      .select()
      .single()

    if (batchError || !batchRow) {
      setError('ไม่สามารถบันทึกรอบคั่วได้')
      setSaving(false)
      return
    }

    const newStock = Number(sourceLot.stock_quantity) - used
    await supabase.from('green_bean_lots').update({ stock_quantity: newStock }).eq('id', sourceLot.id)

    await supabase.from('inventory_stock_movements').insert([
      {
        material_type: 'green_bean',
        movement_type: 'process',
        reference_id: sourceLot.id,
        reference_label: sourceLot.lot_number,
        warehouse_id: warehouseId || null,
        quantity_kg: -used,
        note: `คั่วเป็นรอบ ${batchCode}`,
        created_by: userData.user?.id ?? null,
      },
      {
        material_type: 'roasted_bean',
        movement_type: 'process',
        reference_id: batchRow.id,
        reference_label: batchCode,
        warehouse_id: warehouseId || null,
        quantity_kg: output,
        note: `ผลผลิตจากการคั่วสารกาแฟล็อต ${sourceLot.lot_number}`,
        created_by: userData.user?.id ?? null,
      },
    ])

    setSaving(false)
    setKgUsed('')
    setKgOutput('')
    setRoastLevel('')
    setGreenBeanLotId('')
    onCreated(batchRow as RoastingBatch, sourceLot.id, Number(sourceLot.available_quantity) - used)
  }

  return (
    <form onSubmit={handleSubmit} style={card}>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 10 }}>
        <label>
          <span style={fieldLabel}>ล็อตสารกาแฟ</span>
          <select value={greenBeanLotId} onChange={(e) => setGreenBeanLotId(e.target.value)} style={fieldInput}>
            <option value="">— เลือกล็อต —</option>
            {greenBeanLots.map((l) => (
              <option key={l.id} value={l.id}>
                {l.lot_number} (พร้อมใช้ {Number(l.available_quantity).toLocaleString()} กก.)
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
          <span style={fieldLabel}>สารกาแฟที่ใช้ (กก.)</span>
          <input type="number" step="any" value={kgUsed} onChange={(e) => setKgUsed(e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>กาแฟคั่วที่ได้ (กก.)</span>
          <input type="number" step="any" value={kgOutput} onChange={(e) => setKgOutput(e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>ระดับการคั่ว</span>
          <input type="text" value={roastLevel} onChange={(e) => setRoastLevel(e.target.value)} style={fieldInput} />
        </label>
      </div>

      {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 8 }}>{error}</p>}

      <button type="submit" disabled={saving} style={primaryButton}>
        {saving ? 'กำลังบันทึก...' : 'บันทึกรอบคั่ว'}
      </button>
    </form>
  )
}

function FinishedGoodsForm({
  supabase,
  warehouses,
  batches,
  roastedStock,
  onCreated,
}: {
  supabase: ReturnType<typeof createClient>
  warehouses: Warehouse[]
  batches: RoastingBatch[]
  roastedStock: Record<string, number>
  onCreated: (row: FinishedGoodsStock, warehouseKey: string, usedKg: number) => void
}) {
  const [productName, setProductName] = useState('')
  const [packageSize, setPackageSize] = useState('')
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? '')
  const [roastingBatchId, setRoastingBatchId] = useState('')
  const [stockQuantity, setStockQuantity] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const qty = Number(stockQuantity)
    if (!productName.trim()) {
      setError('กรุณากรอกชื่อสินค้า')
      return
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('กรุณากรอกปริมาณให้ถูกต้อง')
      return
    }
    const warehouseKey = warehouseId || 'unassigned'
    const available = roastedStock[warehouseKey] ?? 0
    if (qty > available) {
      setError('ปริมาณเกินกว่ากาแฟคั่วคงเหลือในคลังนี้')
      return
    }
    setSaving(true)

    const { data: userData } = await supabase.auth.getUser()

    const { data: row, error: rowError } = await supabase
      .from('finished_goods_stock')
      .insert({
        product_name: productName,
        package_size: packageSize || null,
        warehouse_id: warehouseId || null,
        roasting_batch_id: roastingBatchId || null,
        stock_quantity: qty,
        unit_cost: unitCost === '' ? null : Number(unitCost),
      })
      .select()
      .single()

    if (rowError || !row) {
      setError('ไม่สามารถบันทึกสินค้าสำเร็จรูปได้')
      setSaving(false)
      return
    }

    await supabase.from('inventory_stock_movements').insert([
      {
        material_type: 'roasted_bean',
        movement_type: 'process',
        reference_id: roastingBatchId || null,
        reference_label: productName,
        warehouse_id: warehouseId || null,
        quantity_kg: -qty,
        note: `บรรจุเป็นสินค้าสำเร็จรูป ${productName}`,
        created_by: userData.user?.id ?? null,
      },
      {
        material_type: 'finished_goods',
        movement_type: 'process',
        reference_id: row.id,
        reference_label: productName,
        warehouse_id: warehouseId || null,
        quantity_kg: qty,
        note: `บรรจุภัณฑ์สินค้า ${productName}`,
        created_by: userData.user?.id ?? null,
      },
    ])

    setSaving(false)
    setProductName('')
    setPackageSize('')
    setStockQuantity('')
    setUnitCost('')
    setRoastingBatchId('')
    onCreated(row as FinishedGoodsStock, warehouseKey, qty)
  }

  return (
    <form onSubmit={handleSubmit} style={card}>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 10 }}>
        <label>
          <span style={fieldLabel}>ชื่อสินค้า</span>
          <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>ขนาดบรรจุ</span>
          <input type="text" value={packageSize} onChange={(e) => setPackageSize(e.target.value)} style={fieldInput} />
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
          <span style={fieldLabel}>รอบคั่วอ้างอิง</span>
          <select value={roastingBatchId} onChange={(e) => setRoastingBatchId(e.target.value)} style={fieldInput}>
            <option value="">— ไม่ระบุ —</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.batch_code}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span style={fieldLabel}>ปริมาณ</span>
          <input type="number" step="any" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>ต้นทุนต่อหน่วย</span>
          <input type="number" step="any" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} style={fieldInput} />
        </label>
      </div>

      {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 8 }}>{error}</p>}

      <button type="submit" disabled={saving} style={primaryButton}>
        {saving ? 'กำลังบันทึก...' : 'บันทึกสินค้าสำเร็จรูป'}
      </button>
    </form>
  )
}

function PackagingForm({
  supabase,
  warehouses,
  onCreated,
}: {
  supabase: ReturnType<typeof createClient>
  warehouses: Warehouse[]
  onCreated: (row: PackagingMaterial) => void
}) {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('pcs')
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? '')
  const [stockQuantity, setStockQuantity] = useState('')
  const [reorderThreshold, setReorderThreshold] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('กรุณากรอกชื่อวัสดุ')
      return
    }
    const qty = Number(stockQuantity)
    if (!Number.isFinite(qty) || qty < 0) {
      setError('กรุณากรอกปริมาณให้ถูกต้อง')
      return
    }
    setSaving(true)

    const { data: userData } = await supabase.auth.getUser()

    const { data: row, error: rowError } = await supabase
      .from('packaging_materials')
      .insert({
        name,
        unit: unit || 'pcs',
        warehouse_id: warehouseId || null,
        stock_quantity: qty,
        reorder_threshold: reorderThreshold === '' ? 0 : Number(reorderThreshold),
      })
      .select()
      .single()

    if (rowError || !row) {
      setError('ไม่สามารถบันทึกวัสดุบรรจุภัณฑ์ได้')
      setSaving(false)
      return
    }

    await supabase.from('inventory_stock_movements').insert({
      material_type: 'packaging',
      movement_type: 'receive',
      reference_id: row.id,
      reference_label: name,
      warehouse_id: warehouseId || null,
      quantity_kg: qty,
      note: `รับเข้าวัสดุบรรจุภัณฑ์ ${name}`,
      created_by: userData.user?.id ?? null,
    })

    setSaving(false)
    setName('')
    setStockQuantity('')
    setReorderThreshold('')
    onCreated(row as PackagingMaterial)
  }

  return (
    <form onSubmit={handleSubmit} style={card}>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 10 }}>
        <label>
          <span style={fieldLabel}>ชื่อวัสดุ</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>หน่วย</span>
          <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} style={fieldInput} />
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
          <span style={fieldLabel}>ปริมาณรับเข้า</span>
          <input type="number" step="any" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>จุดสั่งซื้อ</span>
          <input type="number" step="any" value={reorderThreshold} onChange={(e) => setReorderThreshold(e.target.value)} style={fieldInput} />
        </label>
      </div>

      {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 8 }}>{error}</p>}

      <button type="submit" disabled={saving} style={primaryButton}>
        {saving ? 'กำลังบันทึก...' : 'รับเข้าวัสดุบรรจุภัณฑ์'}
      </button>
    </form>
  )
}

function ReportCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 12, color: '#6b8f5e', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#2d4a3a' }}>{value}</div>
    </div>
  )
}
