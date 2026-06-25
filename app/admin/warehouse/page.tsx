import { createClient } from '@/lib/supabase/server'
import { getInventoryThresholds } from '@/lib/warehouse/data'
import { MATERIAL_TYPE_LABELS, type MaterialType } from '@/lib/warehouse/types'

const th: React.CSSProperties = { padding: '10px 14px', fontWeight: 600, color: '#2d4a3a' }
const td: React.CSSProperties = { padding: '10px 14px', color: '#444' }

export default async function WarehouseDashboardPage() {
  const supabase = await createClient()

  const [thresholds, { data: cherryMovements }, { data: roastedMovements }, { data: parchmentLots }, { data: greenBeanLots }, { data: packaging }, { data: finishedGoods }] =
    await Promise.all([
      getInventoryThresholds(supabase),
      supabase.from('inventory_stock_movements').select('quantity_kg').eq('material_type', 'cherry'),
      supabase.from('inventory_stock_movements').select('quantity_kg').eq('material_type', 'roasted_bean'),
      supabase.from('parchment_lots').select('remaining_kg'),
      supabase.from('green_bean_lots').select('stock_quantity'),
      supabase.from('packaging_materials').select('stock_quantity'),
      supabase.from('finished_goods_stock').select('stock_quantity'),
    ])

  const sum = (rows: { [k: string]: unknown }[] | null, key: string) => (rows ?? []).reduce((s, r) => s + Number(r[key] ?? 0), 0)

  const stockByMaterial: Record<MaterialType, number> = {
    cherry: sum(cherryMovements, 'quantity_kg'),
    parchment: sum(parchmentLots, 'remaining_kg'),
    green_bean: sum(greenBeanLots, 'stock_quantity'),
    roasted_bean: sum(roastedMovements, 'quantity_kg'),
    packaging: sum(packaging, 'stock_quantity'),
    finished_goods: sum(finishedGoods, 'stock_quantity'),
  }

  const materialOrder: MaterialType[] = ['cherry', 'parchment', 'green_bean', 'roasted_bean', 'packaging', 'finished_goods']
  const lowStockAlerts = materialOrder.filter((m) => stockByMaterial[m] <= thresholds[m])

  return (
    <div>
      <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>แดชบอร์ดคลังสินค้า</h1>
      <p style={{ color: '#6b8f5e', marginBottom: 20 }}>ภาพรวมสต็อกเชอร์รี่ กะลา สารกาแฟ กาแฟคั่ว และการแจ้งเตือนสต็อกต่ำ</p>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 24 }}>
        {(['cherry', 'parchment', 'green_bean', 'roasted_bean'] as MaterialType[]).map((m) => (
          <StockCard
            key={m}
            label={MATERIAL_TYPE_LABELS[m]}
            value={`${stockByMaterial[m].toLocaleString()} กก.`}
            low={stockByMaterial[m] <= thresholds[m]}
          />
        ))}
      </div>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 24 }}>
        {(['packaging', 'finished_goods'] as MaterialType[]).map((m) => (
          <StockCard
            key={m}
            label={MATERIAL_TYPE_LABELS[m]}
            value={stockByMaterial[m].toLocaleString()}
            low={stockByMaterial[m] <= thresholds[m]}
          />
        ))}
      </div>

      <h2 style={{ fontSize: 16, color: '#2d4a3a', marginBottom: 10 }}>การแจ้งเตือนสต็อกต่ำ</h2>
      {lowStockAlerts.length === 0 ? (
        <p style={{ color: '#256029' }}>สต็อกทุกประเภทอยู่ในระดับปกติ</p>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#fdf0f0', textAlign: 'left' }}>
                <th style={th}>วัตถุดิบ</th>
                <th style={th}>คงเหลือ</th>
                <th style={th}>เกณฑ์แจ้งเตือน</th>
              </tr>
            </thead>
            <tbody>
              {lowStockAlerts.map((m) => (
                <tr key={m} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>{MATERIAL_TYPE_LABELS[m]}</td>
                  <td style={{ ...td, color: '#c0392b', fontWeight: 700 }}>{stockByMaterial[m].toLocaleString()}</td>
                  <td style={td}>{thresholds[m].toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StockCard({ label, value, low }: { label: string; value: string; low: boolean }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: low ? '1px solid #e8b4b4' : 'none' }}>
      <div style={{ fontSize: 12, color: '#6b8f5e', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: low ? '#c0392b' : '#2d4a3a' }}>{value}</div>
      {low && <div style={{ fontSize: 11, color: '#c0392b', marginTop: 4 }}>⚠ สต็อกต่ำกว่าเกณฑ์</div>}
    </div>
  )
}
