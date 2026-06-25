import { createClient } from '@/lib/supabase/server'
import { getWarehouses, todayDateString } from '@/lib/warehouse/data'
import { MOVEMENT_TYPE_LABELS } from '@/lib/warehouse/types'

export default async function InventoryCherryPage() {
  const supabase = await createClient()
  const today = todayDateString()

  const [warehouses, { data: todayReceivings }, { data: movements }] = await Promise.all([
    getWarehouses(supabase),
    supabase.from('cherry_receivings').select('accepted_weight, received_at').gte('received_at', `${today}T00:00:00`).lte('received_at', `${today}T23:59:59`),
    supabase
      .from('inventory_stock_movements')
      .select('id, movement_type, quantity_kg, warehouse_id, related_warehouse_id, reference_label, note, created_at')
      .eq('material_type', 'cherry')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const warehouseName = (id: string | null) => warehouses.find((w) => w.id === id)?.name ?? '-'

  const totalToday = (todayReceivings ?? []).reduce((s, r) => s + Number(r.accepted_weight ?? 0), 0)

  const { data: allMovements } = await supabase.from('inventory_stock_movements').select('warehouse_id, quantity_kg').eq('material_type', 'cherry')
  const fullStockByWarehouse = new Map<string, number>()
  for (const m of allMovements ?? []) {
    const key = m.warehouse_id ?? 'unassigned'
    fullStockByWarehouse.set(key, (fullStockByWarehouse.get(key) ?? 0) + Number(m.quantity_kg))
  }

  return (
    <div>
      <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>คลังเชอร์รี่</h1>
      <p style={{ color: '#6b8f5e', marginBottom: 20 }}>ปริมาณรับเข้าวันนี้ สต็อกตามคลัง และประวัติการเคลื่อนไหว</p>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 24 }}>
        <ReportCard label="รับเข้าวันนี้" value={`${totalToday.toLocaleString()} กก.`} />
        <ReportCard label="จำนวนคลัง" value={String(warehouses.length)} />
        <ReportCard label="รายการเคลื่อนไหวล่าสุด" value={String((movements ?? []).length)} />
      </div>

      <h2 style={{ fontSize: 16, color: '#2d4a3a', marginBottom: 10 }}>สต็อกเชอร์รี่ตามคลัง</h2>
      {fullStockByWarehouse.size === 0 ? (
        <p style={{ color: '#999', marginBottom: 24 }}>ยังไม่มีข้อมูลสต็อก</p>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f7f2', textAlign: 'left' }}>
                <th style={th}>คลัง</th>
                <th style={th}>สต็อก (กก.)</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(fullStockByWarehouse.entries()).map(([wid, kg]) => (
                <tr key={wid} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>{wid === 'unassigned' ? 'ไม่ระบุคลัง' : warehouseName(wid)}</td>
                  <td style={td}>{kg.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={{ fontSize: 16, color: '#2d4a3a', marginBottom: 10 }}>ประวัติการเคลื่อนไหวสต็อกเชอร์รี่</h2>
      {(movements ?? []).length === 0 ? (
        <p style={{ color: '#999' }}>ยังไม่มีประวัติการเคลื่อนไหว</p>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f7f2', textAlign: 'left' }}>
                <th style={th}>วันที่</th>
                <th style={th}>ประเภท</th>
                <th style={th}>คลัง</th>
                <th style={th}>ปริมาณ (กก.)</th>
                <th style={th}>อ้างอิง</th>
              </tr>
            </thead>
            <tbody>
              {(movements ?? []).map((m) => (
                <tr key={m.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>{new Date(m.created_at).toLocaleString('th-TH')}</td>
                  <td style={td}>{MOVEMENT_TYPE_LABELS[m.movement_type as keyof typeof MOVEMENT_TYPE_LABELS] ?? m.movement_type}</td>
                  <td style={td}>{warehouseName(m.warehouse_id)}</td>
                  <td style={td}>{Number(m.quantity_kg).toLocaleString()}</td>
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

const th: React.CSSProperties = { padding: '10px 14px', fontWeight: 600, color: '#2d4a3a' }
const td: React.CSSProperties = { padding: '10px 14px', color: '#444' }

function ReportCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 12, color: '#6b8f5e', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#2d4a3a' }}>{value}</div>
    </div>
  )
}
