import { createClient } from '@/lib/supabase/server'
import { getWarehouses, daysAgoIso } from '@/lib/warehouse/data'
import { roastYieldPercent } from '@/lib/warehouse/types'
import CsvExportButton from './CsvExportButton'

const th: React.CSSProperties = { padding: '10px 14px', fontWeight: 600, color: '#2d4a3a' }
const td: React.CSSProperties = { padding: '10px 14px', color: '#444' }
const tableWrap: React.CSSProperties = { background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 12 }

export default async function InventoryReportsPage() {
  const supabase = await createClient()

  const thirtyDaysAgo = daysAgoIso(30)

  const [
    warehouses,
    { data: receivings },
    { data: parchmentLots },
    { data: roastingBatches },
    { data: greenBeanLots },
    { data: finishedGoods },
    { data: allMovements },
  ] = await Promise.all([
    getWarehouses(supabase),
    supabase.from('cherry_receivings').select('accepted_weight, received_at').gte('received_at', thirtyDaysAgo),
    supabase.from('parchment_lots').select('lot_code, source_cherry_kg, parchment_kg, yield_percent, remaining_kg, created_at').order('created_at', { ascending: false }),
    supabase.from('roasting_batches').select('batch_code, green_bean_kg_used, roasted_kg_output, created_at').order('created_at', { ascending: false }),
    supabase.from('green_bean_lots').select('lot_number, stock_quantity, unit_cost, warehouse_id'),
    supabase.from('finished_goods_stock').select('product_name, stock_quantity, unit_cost, warehouse_id'),
    supabase.from('inventory_stock_movements').select('material_type, warehouse_id, quantity_kg'),
  ])

  const warehouseName = (id: string | null) => warehouses.find((w) => w.id === id)?.name ?? 'ไม่ระบุคลัง'

  // 1. Daily receiving
  const byDate = new Map<string, number>()
  for (const r of receivings ?? []) {
    if (!r.received_at) continue
    const date = r.received_at.slice(0, 10)
    byDate.set(date, (byDate.get(date) ?? 0) + Number(r.accepted_weight ?? 0))
  }
  const dailyReceivingRows = Array.from(byDate.entries()).sort((a, b) => b[0].localeCompare(a[0]))

  // 2. Stock balance by warehouse (ledger-derived, all material types)
  const balanceMap = new Map<string, number>()
  for (const m of allMovements ?? []) {
    const key = `${m.material_type}|${m.warehouse_id ?? 'unassigned'}`
    balanceMap.set(key, (balanceMap.get(key) ?? 0) + Number(m.quantity_kg))
  }
  const stockBalanceRows = Array.from(balanceMap.entries())
    .map(([key, qty]) => {
      const [materialType, warehouseId] = key.split('|')
      return { materialType, warehouseId: warehouseId === 'unassigned' ? null : warehouseId, qty }
    })
    .filter((r) => r.qty !== 0)
    .sort((a, b) => a.materialType.localeCompare(b.materialType))

  // 3. Processing yield
  const parchmentYieldRows = (parchmentLots ?? []).map((l) => ({
    code: l.lot_code,
    input: Number(l.source_cherry_kg),
    output: Number(l.parchment_kg),
    yieldPct: Number(l.yield_percent),
  }))
  const roastingYieldRows = (roastingBatches ?? []).map((b) => ({
    code: b.batch_code,
    input: Number(b.green_bean_kg_used),
    output: Number(b.roasted_kg_output),
    yieldPct: roastYieldPercent(Number(b.green_bean_kg_used), Number(b.roasted_kg_output)),
  }))

  // 4. Inventory valuation
  const greenBeanValuationRows = (greenBeanLots ?? []).map((l) => ({
    name: l.lot_number,
    warehouse: warehouseName(l.warehouse_id),
    qty: Number(l.stock_quantity),
    unitCost: Number(l.unit_cost ?? 0),
    value: Number(l.stock_quantity) * Number(l.unit_cost ?? 0),
  }))
  const finishedGoodsValuationRows = (finishedGoods ?? []).map((f) => ({
    name: f.product_name,
    warehouse: warehouseName(f.warehouse_id),
    qty: Number(f.stock_quantity),
    unitCost: Number(f.unit_cost ?? 0),
    value: Number(f.stock_quantity) * Number(f.unit_cost ?? 0),
  }))
  const totalValuation =
    greenBeanValuationRows.reduce((s, r) => s + r.value, 0) + finishedGoodsValuationRows.reduce((s, r) => s + r.value, 0)

  return (
    <div>
      <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>รายงานคลังสินค้า</h1>
      <p style={{ color: '#6b8f5e', marginBottom: 24 }}>รับเข้าประจำวัน ยอดคงเหลือ % ผลผลิต และมูลค่าสินค้าคงเหลือ</p>

      <SectionHeader
        title="รับเข้าประจำวัน (30 วันล่าสุด)"
        action={
          <CsvExportButton
            headers={['Date', 'Accepted Weight (kg)']}
            rows={dailyReceivingRows.map(([date, kg]) => [date, kg])}
            filename="daily-receiving.csv"
          />
        }
      />
      {dailyReceivingRows.length === 0 ? (
        <p style={{ color: '#999', marginBottom: 24 }}>ยังไม่มีข้อมูล</p>
      ) : (
        <div style={tableWrap}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f7f2', textAlign: 'left' }}>
                <th style={th}>วันที่</th>
                <th style={th}>ปริมาณรับเข้า (กก.)</th>
              </tr>
            </thead>
            <tbody>
              {dailyReceivingRows.map(([date, kg]) => (
                <tr key={date} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>{date}</td>
                  <td style={td}>{kg.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SectionHeader
        title="ยอดคงเหลือตามคลัง"
        action={
          <CsvExportButton
            headers={['Material', 'Warehouse', 'Quantity (kg)']}
            rows={stockBalanceRows.map((r) => [r.materialType, warehouseName(r.warehouseId), r.qty])}
            filename="stock-balance.csv"
          />
        }
      />
      {stockBalanceRows.length === 0 ? (
        <p style={{ color: '#999', marginBottom: 24 }}>ยังไม่มีข้อมูล</p>
      ) : (
        <div style={tableWrap}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f7f2', textAlign: 'left' }}>
                <th style={th}>วัตถุดิบ</th>
                <th style={th}>คลัง</th>
                <th style={th}>คงเหลือ (กก.)</th>
              </tr>
            </thead>
            <tbody>
              {stockBalanceRows.map((r, i) => (
                <tr key={i} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>{r.materialType}</td>
                  <td style={td}>{warehouseName(r.warehouseId)}</td>
                  <td style={td}>{r.qty.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SectionHeader
        title="% ผลผลิตการแปรรูปกะลา"
        action={
          <CsvExportButton
            headers={['Lot Code', 'Cherry Input (kg)', 'Parchment Output (kg)', 'Yield %']}
            rows={parchmentYieldRows.map((r) => [r.code, r.input, r.output, r.yieldPct.toFixed(1)])}
            filename="parchment-yield.csv"
          />
        }
      />
      {parchmentYieldRows.length === 0 ? (
        <p style={{ color: '#999', marginBottom: 24 }}>ยังไม่มีข้อมูล</p>
      ) : (
        <div style={tableWrap}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f7f2', textAlign: 'left' }}>
                <th style={th}>เลขล็อต</th>
                <th style={th}>เชอร์รี่ใช้ (กก.)</th>
                <th style={th}>กะลาที่ได้ (กก.)</th>
                <th style={th}>% ผลผลิต</th>
              </tr>
            </thead>
            <tbody>
              {parchmentYieldRows.map((r) => (
                <tr key={r.code} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>{r.code}</td>
                  <td style={td}>{r.input.toLocaleString()}</td>
                  <td style={td}>{r.output.toLocaleString()}</td>
                  <td style={td}>{r.yieldPct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SectionHeader
        title="% ผลผลิตการคั่ว"
        action={
          <CsvExportButton
            headers={['Batch Code', 'Green Bean Input (kg)', 'Roasted Output (kg)', 'Yield %']}
            rows={roastingYieldRows.map((r) => [r.code, r.input, r.output, r.yieldPct.toFixed(1)])}
            filename="roasting-yield.csv"
          />
        }
      />
      {roastingYieldRows.length === 0 ? (
        <p style={{ color: '#999', marginBottom: 24 }}>ยังไม่มีข้อมูล</p>
      ) : (
        <div style={tableWrap}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f7f2', textAlign: 'left' }}>
                <th style={th}>เลขรอบคั่ว</th>
                <th style={th}>สารกาแฟใช้ (กก.)</th>
                <th style={th}>กาแฟคั่วที่ได้ (กก.)</th>
                <th style={th}>% ผลผลิต</th>
              </tr>
            </thead>
            <tbody>
              {roastingYieldRows.map((r) => (
                <tr key={r.code} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>{r.code}</td>
                  <td style={td}>{r.input.toLocaleString()}</td>
                  <td style={td}>{r.output.toLocaleString()}</td>
                  <td style={td}>{r.yieldPct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SectionHeader
        title={`มูลค่าสินค้าคงเหลือ (รวม ${totalValuation.toLocaleString()} บาท)`}
        action={
          <CsvExportButton
            headers={['Type', 'Name', 'Warehouse', 'Quantity', 'Unit Cost', 'Value']}
            rows={[
              ...greenBeanValuationRows.map((r) => ['Green Bean', r.name, r.warehouse, r.qty, r.unitCost, r.value]),
              ...finishedGoodsValuationRows.map((r) => ['Finished Goods', r.name, r.warehouse, r.qty, r.unitCost, r.value]),
            ]}
            filename="inventory-valuation.csv"
          />
        }
      />
      {greenBeanValuationRows.length === 0 && finishedGoodsValuationRows.length === 0 ? (
        <p style={{ color: '#999' }}>ยังไม่มีข้อมูล</p>
      ) : (
        <div style={tableWrap}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f7f2', textAlign: 'left' }}>
                <th style={th}>ประเภท</th>
                <th style={th}>ชื่อ</th>
                <th style={th}>คลัง</th>
                <th style={th}>ปริมาณ</th>
                <th style={th}>ต้นทุนต่อหน่วย</th>
                <th style={th}>มูลค่า (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {greenBeanValuationRows.map((r) => (
                <tr key={`gb-${r.name}`} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>สารกาแฟ</td>
                  <td style={td}>{r.name}</td>
                  <td style={td}>{r.warehouse}</td>
                  <td style={td}>{r.qty.toLocaleString()}</td>
                  <td style={td}>{r.unitCost.toLocaleString()}</td>
                  <td style={td}>{r.value.toLocaleString()}</td>
                </tr>
              ))}
              {finishedGoodsValuationRows.map((r) => (
                <tr key={`fg-${r.name}`} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>สินค้าสำเร็จรูป</td>
                  <td style={td}>{r.name}</td>
                  <td style={td}>{r.warehouse}</td>
                  <td style={td}>{r.qty.toLocaleString()}</td>
                  <td style={td}>{r.unitCost.toLocaleString()}</td>
                  <td style={td}>{r.value.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function SectionHeader({ title, action }: { title: string; action: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 24 }}>
      <h2 style={{ fontSize: 16, color: '#2d4a3a' }}>{title}</h2>
      {action}
    </div>
  )
}
