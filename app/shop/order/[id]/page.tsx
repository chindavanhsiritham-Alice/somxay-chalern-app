import { createClient } from '@/lib/supabase/server'
import { shopTheme } from '@/lib/shop/theme'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type OrderItemRow = {
  id: string
  product_name: string
  size: string
  temperature: string
  sweetness: string
  addons: { name: string; price: number }[]
  unit_price: number
  quantity: number
  line_total: number
}

const SIZE_LABEL: Record<string, string> = { normal: 'ปกติ', large: 'ใหญ่' }
const TEMP_LABEL: Record<string, string> = { hot: 'ร้อน', iced: 'เย็น' }
const STATUS_LABEL: Record<string, string> = {
  received: 'รับออเดอร์แล้ว',
  preparing: 'กำลังเตรียม',
  ready: 'พร้อมรับ',
  completed: 'รับสินค้าแล้ว',
  cancelled: 'ยกเลิก',
}

export default async function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('shop_orders')
    .select('id, order_code, customer_name, customer_phone, pickup_branch, payment_method, note, total, status, created_at')
    .eq('id', id)
    .maybeSingle()

  if (!order) notFound()

  const { data: items } = await supabase
    .from('shop_order_items')
    .select('id, product_name, size, temperature, sweetness, addons, unit_price, quantity, line_total')
    .eq('order_id', id)

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 48 }}>✅</div>
        <h1 style={{ color: shopTheme.maroon, fontSize: 22, margin: '8px 0 4px' }}>สั่งซื้อสำเร็จ!</h1>
        <p style={{ color: shopTheme.muted, fontSize: 14 }}>หมายเลขคำสั่งซื้อ {order.order_code}</p>
      </div>

      <div style={{ background: '#fff', border: `1px solid ${shopTheme.border}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <Row label="สถานะ" value={STATUS_LABEL[order.status] ?? order.status} />
        <Row label="ผู้สั่ง" value={`${order.customer_name} (${order.customer_phone})`} />
        <Row label="สาขารับสินค้า" value={order.pickup_branch} />
        <Row label="วิธีชำระเงิน" value={order.payment_method} />
        {order.note && <Row label="หมายเหตุ" value={order.note} />}
      </div>

      <div style={{ background: '#fff', border: `1px solid ${shopTheme.border}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
        {((items as OrderItemRow[]) ?? []).map((item) => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
            <div>
              <div style={{ fontWeight: 600 }}>
                {item.product_name} x{item.quantity}
              </div>
              <div style={{ color: shopTheme.muted, fontSize: 12 }}>
                {SIZE_LABEL[item.size] ?? item.size} · {TEMP_LABEL[item.temperature] ?? item.temperature} · {item.sweetness}
                {item.addons.length > 0 && ` · ${item.addons.map((a) => a.name).join(', ')}`}
              </div>
            </div>
            <div style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{item.line_total} บาท</div>
          </div>
        ))}
        <div style={{ borderTop: `1px solid ${shopTheme.border}`, marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
          <span>รวมทั้งหมด</span>
          <span style={{ color: shopTheme.maroon }}>{order.total} บาท</span>
        </div>
      </div>

      <Link
        href="/shop"
        style={{ display: 'block', textAlign: 'center', background: shopTheme.maroon, color: '#fff', padding: '14px', borderRadius: 10, textDecoration: 'none', fontWeight: 700 }}
      >
        สั่งเพิ่ม
      </Link>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
      <span style={{ color: shopTheme.muted }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  )
}
