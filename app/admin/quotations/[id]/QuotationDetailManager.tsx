'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  APPROVAL_STATUS_LABELS,
  QUOTATION_STATUS_LABELS,
  calcLineTotal,
  lineRequiresApproval,
  type ApprovalStatus,
  type Quotation,
  type QuotationItem,
  type QuotationStatus,
} from '@/lib/sales/types'
import { tierPriceFor } from '@/lib/sales/data'
import type { Customer, SalesRep } from '@/lib/crm/types'
import type { Product } from '@/app/admin/products/ProductsManager'
import type { ProductTierPrice } from '@/lib/sales/types'

const fieldLabel: React.CSSProperties = { fontSize: 11, color: '#6b8f5e', marginBottom: 4, display: 'block' }
const fieldInput: React.CSSProperties = { width: '100%', padding: '7px 9px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }
const primaryButton: React.CSSProperties = { background: '#2d7a3a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const secondaryButton: React.CSSProperties = { background: '#eef2ea', color: '#2d4a3a', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const dangerButton: React.CSSProperties = { background: '#f5d6d6', color: '#9a2a2a', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const card: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const badge: React.CSSProperties = { display: 'inline-block', padding: '3px 11px', borderRadius: 999, fontSize: 12, fontWeight: 600 }

const STATUS_COLORS: Record<QuotationStatus, { bg: string; fg: string }> = {
  draft: { bg: '#eee', fg: '#777' },
  sent: { bg: '#dbe9fb', fg: '#1f5c9e' },
  accepted: { bg: '#d9f0d4', fg: '#256029' },
  rejected: { bg: '#f5d6d6', fg: '#9a2a2a' },
  expired: { bg: '#f0e0c8', fg: '#915c1c' },
  converted: { bg: '#dcd0f5', fg: '#5c2a9a' },
}

const APPROVAL_COLORS: Record<ApprovalStatus, { bg: string; fg: string }> = {
  not_required: { bg: '#eee', fg: '#777' },
  pending_approval: { bg: '#fdf3d6', fg: '#8a6d1f' },
  approved: { bg: '#d9f0d4', fg: '#256029' },
  rejected: { bg: '#f5d6d6', fg: '#9a2a2a' },
}

const NEXT_STATUS_OPTIONS: Record<QuotationStatus, QuotationStatus[]> = {
  draft: ['draft', 'sent'],
  sent: ['sent', 'accepted', 'rejected', 'expired'],
  accepted: ['accepted', 'rejected', 'expired'],
  rejected: ['rejected'],
  expired: ['expired'],
  converted: ['converted'],
}

type QuotationWithCustomer = Quotation & { customers: Customer }

function customerLabel(c: Customer) {
  return c.company_name ?? c.shop_name ?? c.owner_name ?? c.customer_code ?? c.id
}

let keySeq = 0
function nextKey() {
  keySeq += 1
  return `item-${keySeq}`
}

type DraftItem = {
  key: string
  product_id: string | number | null
  product_name: string
  kg: number
  unit_price: number
  discount_percent: number
  discount_amount: number
}

export default function QuotationDetailManager({
  quotation,
  items,
  salesReps,
  products,
  tierPrices,
  currentUserId,
  currentUserRole,
}: {
  quotation: QuotationWithCustomer
  items: QuotationItem[]
  salesReps: SalesRep[]
  products: Product[]
  tierPrices: ProductTierPrice[]
  currentUserId: string | null
  currentUserRole: string | null
}) {
  const router = useRouter()
  const supabase = createClient()

  const [q, setQ] = useState(quotation)
  const [draftItems, setDraftItems] = useState<DraftItem[]>(
    items.map((it) => ({
      key: nextKey(),
      product_id: it.product_id,
      product_name: it.product_name ?? '',
      kg: it.kg,
      unit_price: it.unit_price,
      discount_percent: it.discount_percent,
      discount_amount: it.discount_amount,
    }))
  )
  const [editingItems, setEditingItems] = useState(false)
  const [nextStatus, setNextStatus] = useState<QuotationStatus>(quotation.status)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [activityType, setActivityType] = useState('note')
  const [activityNote, setActivityNote] = useState('')

  const isAdminManager = currentUserRole === 'admin' || currentUserRole === 'manager'
  const productMap = useMemo(() => new Map(products.map((p) => [String(p.id), p])), [products])

  const rows = draftItems.map((it) => {
    const tierPrice = q.customers ? tierPriceFor(tierPrices, it.product_id ?? '', q.customers.tier, q.currency) : null
    const total = calcLineTotal(it.kg, it.unit_price, it.discount_percent, it.discount_amount)
    const requiresApproval = lineRequiresApproval(it.unit_price, it.discount_percent, tierPrice)
    return { ...it, tierPrice, total, requiresApproval }
  })
  const subtotal = rows.reduce((sum, r) => sum + r.kg * r.unit_price, 0)
  const total = rows.reduce((sum, r) => sum + r.total, 0)
  const discountTotal = Math.max(0, subtotal - total)
  const anyRequiresApproval = rows.some((r) => r.requiresApproval)

  const updateItem = (key: string, patch: Partial<DraftItem>) => {
    setDraftItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)))
  }

  const onProductChange = (key: string, productId: string) => {
    const product = productMap.get(productId)
    if (!product) return
    updateItem(key, { product_id: product.id, product_name: product.name })
  }

  const addItem = () => {
    const first = products[0]
    if (!first) return
    setDraftItems((prev) => [
      ...prev,
      { key: nextKey(), product_id: first.id, product_name: first.name, kg: 0, unit_price: 0, discount_percent: 0, discount_amount: 0 },
    ])
  }

  const removeItem = (key: string) => setDraftItems((prev) => prev.filter((it) => it.key !== key))

  const saveItems = async () => {
    setBusy(true)
    setError('')
    const approvalStatus: ApprovalStatus = anyRequiresApproval ? 'pending_approval' : 'not_required'

    const { error: delErr } = await supabase.from('quotation_items').delete().eq('quotation_id', q.id)
    if (delErr) {
      setError(delErr.message)
      setBusy(false)
      return
    }
    const itemRows = rows.map((r, idx) => ({
      quotation_id: q.id,
      product_id: r.product_id,
      product_name: r.product_name,
      kg: r.kg,
      unit_price: r.unit_price,
      tier_price: r.tierPrice,
      discount_percent: r.discount_percent,
      discount_amount: r.discount_amount,
      requires_approval: r.requiresApproval,
      total: r.total,
      sort_order: idx,
    }))
    const { error: insErr } = await supabase.from('quotation_items').insert(itemRows)
    if (insErr) {
      setError(insErr.message)
      setBusy(false)
      return
    }
    const { error: updErr } = await supabase
      .from('quotations')
      .update({ subtotal, discount_total: discountTotal, total, approval_status: approvalStatus, updated_at: new Date().toISOString() })
      .eq('id', q.id)
    setBusy(false)
    if (updErr) {
      setError(updErr.message)
      return
    }
    setQ((prev) => ({ ...prev, subtotal, discount_total: discountTotal, total, approval_status: approvalStatus }))
    setEditingItems(false)
  }

  const updateStatus = async () => {
    setBusy(true)
    setError('')
    const { error: updErr } = await supabase
      .from('quotations')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', q.id)
    setBusy(false)
    if (updErr) {
      setError(updErr.message)
      return
    }
    setQ((prev) => ({ ...prev, status: nextStatus }))
  }

  const approve = async () => {
    setBusy(true)
    setError('')
    const { error: updErr } = await supabase
      .from('quotations')
      .update({ approval_status: 'approved', approved_by: currentUserId, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', q.id)
    setBusy(false)
    if (updErr) {
      setError(updErr.message)
      return
    }
    setQ((prev) => ({ ...prev, approval_status: 'approved', approved_by: currentUserId, approved_at: new Date().toISOString() }))
  }

  const reject = async () => {
    const reason = window.prompt('เหตุผลที่ปฏิเสธการอนุมัติ:')
    if (reason === null) return
    setBusy(true)
    setError('')
    const { error: updErr } = await supabase
      .from('quotations')
      .update({ approval_status: 'rejected', rejected_reason: reason, updated_at: new Date().toISOString() })
      .eq('id', q.id)
    setBusy(false)
    if (updErr) {
      setError(updErr.message)
      return
    }
    setQ((prev) => ({ ...prev, approval_status: 'rejected', rejected_reason: reason }))
  }

  const canConvert = q.status === 'accepted' && q.approval_status !== 'pending_approval' && q.approval_status !== 'rejected' && !q.converted_order_id

  const convertToOrder = async () => {
    if (!window.confirm('ยืนยันการแปลงใบเสนอราคานี้เป็นออเดอร์?')) return
    setBusy(true)
    setError('')

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        customer_id: q.customer_id,
        order_date: new Date().toISOString().slice(0, 10),
        status: 'processing',
        currency: q.currency,
        subtotal: q.subtotal,
        total_usd: q.currency === 'USD' ? q.total : null,
        notes: q.notes,
        quotation_id: q.id,
        sales_rep_id: q.sales_rep_id,
      })
      .select('id')
      .single()

    if (orderErr || !order) {
      setError(orderErr?.message ?? 'แปลงเป็นออเดอร์ไม่สำเร็จ')
      setBusy(false)
      return
    }

    const orderItemRows = rows.map((r) => ({
      order_id: order.id,
      product_catalog_id: r.product_id,
      quantity_kg: r.kg,
      unit_price: r.unit_price,
      discount_percent: r.discount_percent,
      discount_amount: r.discount_amount,
      line_total: r.total,
    }))
    const { error: orderItemsErr } = await supabase.from('order_items').insert(orderItemRows)
    if (orderItemsErr) {
      setError(orderItemsErr.message)
      setBusy(false)
      return
    }

    // Reserve stock: bump products_catalog.reserved_kg for each line item.
    for (const r of rows) {
      if (r.product_id == null || r.kg <= 0) continue
      const { data: freshProduct } = await supabase.from('products_catalog').select('reserved_kg').eq('id', r.product_id).maybeSingle()
      const currentReservedKg = Number(freshProduct?.reserved_kg ?? 0)
      await supabase
        .from('products_catalog')
        .update({ reserved_kg: currentReservedKg + r.kg })
        .eq('id', r.product_id)
    }

    const { error: finalErr } = await supabase
      .from('quotations')
      .update({ status: 'converted', converted_order_id: order.id, converted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', q.id)

    setBusy(false)
    if (finalErr) {
      setError(finalErr.message)
      return
    }
    setQ((prev) => ({ ...prev, status: 'converted', converted_order_id: order.id }))
    router.refresh()
  }

  const logActivity = async () => {
    setBusy(true)
    setError('')
    const { error: actErr } = await supabase.from('customer_timeline').insert({
      customer_id: q.customer_id,
      interaction_type: activityType,
      note: activityNote || `เกี่ยวกับใบเสนอราคา ${q.quotation_number}`,
      created_by: currentUserId,
    })
    setBusy(false)
    if (actErr) {
      setError(actErr.message)
      return
    }
    setActivityNote('')
    router.refresh()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <Link href="/admin/quotations" style={{ color: '#6b8f5e', fontSize: 13, textDecoration: 'none' }}>
            ← กลับไปที่รายการใบเสนอราคา
          </Link>
          <h1 style={{ color: '#2d7a3a', margin: '6px 0 4px' }}>{q.quotation_number}</h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ ...badge, background: STATUS_COLORS[q.status].bg, color: STATUS_COLORS[q.status].fg }}>
              {QUOTATION_STATUS_LABELS[q.status]}
            </span>
            <span style={{ ...badge, background: APPROVAL_COLORS[q.approval_status].bg, color: APPROVAL_COLORS[q.approval_status].fg }}>
              {APPROVAL_STATUS_LABELS[q.approval_status]}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href={`/admin/quotations/${q.id}/print`} target="_blank" rel="noreferrer" style={{ ...secondaryButton, textDecoration: 'none', display: 'inline-block' }}>
            🖨️ พิมพ์ / PDF
          </a>
          {canConvert && (
            <button style={primaryButton} onClick={convertToOrder} disabled={busy}>
              แปลงเป็นออเดอร์ (Convert to Order)
            </button>
          )}
        </div>
      </div>

      {error && <p style={{ color: '#c0392b', marginBottom: 12 }}>{error}</p>}

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <div style={card}>
          <h3 style={{ color: '#2d4a3a', marginTop: 0 }}>ข้อมูลลูกค้า</h3>
          <p style={{ margin: '4px 0' }}>{customerLabel(q.customers)}</p>
          <p style={{ margin: '4px 0', color: '#777', fontSize: 13 }}>{q.customers.phone ?? '-'}</p>
          <p style={{ margin: '4px 0', color: '#777', fontSize: 13 }}>Tier: {q.customers.tier ?? '-'}</p>
        </div>
        <div style={card}>
          <h3 style={{ color: '#2d4a3a', marginTop: 0 }}>รายละเอียดใบเสนอราคา</h3>
          <p style={{ margin: '4px 0', fontSize: 13 }}>วันที่: {q.quotation_date}</p>
          <p style={{ margin: '4px 0', fontSize: 13 }}>หมดอายุ: {q.expiry_date ?? '-'}</p>
          <p style={{ margin: '4px 0', fontSize: 13 }}>สกุลเงิน: {q.currency}</p>
          <p style={{ margin: '4px 0', fontSize: 13 }}>เซลส์: {salesReps.find((s) => s.id === q.sales_rep_id)?.full_name ?? '-'}</p>
        </div>
        <div style={card}>
          <h3 style={{ color: '#2d4a3a', marginTop: 0 }}>เปลี่ยนสถานะ</h3>
          <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value as QuotationStatus)} style={fieldInput}>
            {NEXT_STATUS_OPTIONS[q.status].map((s) => (
              <option key={s} value={s}>
                {QUOTATION_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button style={{ ...primaryButton, marginTop: 10, width: '100%' }} onClick={updateStatus} disabled={busy || nextStatus === q.status}>
            อัปเดตสถานะ
          </button>
          {isAdminManager && q.approval_status === 'pending_approval' && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button style={primaryButton} onClick={approve} disabled={busy}>
                ✅ อนุมัติ
              </button>
              <button style={dangerButton} onClick={reject} disabled={busy}>
                ❌ ปฏิเสธ
              </button>
            </div>
          )}
          {q.rejected_reason && <p style={{ fontSize: 12, color: '#9a2a2a', marginTop: 8 }}>เหตุผลที่ถูกปฏิเสธ: {q.rejected_reason}</p>}
        </div>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ color: '#2d4a3a', margin: 0 }}>รายการสินค้า</h3>
          {q.status === 'draft' && (
            <button style={secondaryButton} onClick={() => setEditingItems((v) => !v)}>
              {editingItems ? 'ยกเลิกแก้ไข' : 'แก้ไขรายการ'}
            </button>
          )}
        </div>

        {editingItems ? (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 760 }}>
                <thead>
                  <tr style={{ background: '#f5f7f2', textAlign: 'left' }}>
                    <th style={{ padding: 8 }}>สินค้า</th>
                    <th style={{ padding: 8 }}>กก.</th>
                    <th style={{ padding: 8 }}>ราคา/กก.</th>
                    <th style={{ padding: 8 }}>ส่วนลด %</th>
                    <th style={{ padding: 8 }}>ส่วนลด</th>
                    <th style={{ padding: 8 }}>รวม</th>
                    <th style={{ padding: 8 }} />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key} style={{ borderTop: '1px solid #eee' }}>
                      <td style={{ padding: 8 }}>
                        <select value={String(r.product_id ?? '')} onChange={(e) => onProductChange(r.key, e.target.value)} style={fieldInput}>
                          {products.map((p) => (
                            <option key={String(p.id)} value={String(p.id)}>
                              {p.name} {p.grade ? `(${p.grade})` : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: 8 }}>
                        <input type="number" value={r.kg} onChange={(e) => updateItem(r.key, { kg: Number(e.target.value) })} style={{ ...fieldInput, width: 90 }} />
                      </td>
                      <td style={{ padding: 8 }}>
                        <input
                          type="number"
                          value={r.unit_price}
                          onChange={(e) => updateItem(r.key, { unit_price: Number(e.target.value) })}
                          style={{ ...fieldInput, width: 100, borderColor: r.requiresApproval ? '#e0a23c' : '#ccc' }}
                        />
                      </td>
                      <td style={{ padding: 8 }}>
                        <input type="number" value={r.discount_percent} onChange={(e) => updateItem(r.key, { discount_percent: Number(e.target.value) })} style={{ ...fieldInput, width: 80 }} />
                      </td>
                      <td style={{ padding: 8 }}>
                        <input type="number" value={r.discount_amount} onChange={(e) => updateItem(r.key, { discount_amount: Number(e.target.value) })} style={{ ...fieldInput, width: 90 }} />
                      </td>
                      <td style={{ padding: 8, fontWeight: 600 }}>{r.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td style={{ padding: 8 }}>
                        <button style={secondaryButton} onClick={() => removeItem(r.key)}>
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
              <button style={secondaryButton} onClick={addItem}>
                + เพิ่มรายการ
              </button>
              <button style={primaryButton} onClick={saveItems} disabled={busy}>
                บันทึกรายการ
              </button>
            </div>
          </>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}>
              <thead>
                <tr style={{ background: '#f5f7f2', textAlign: 'left' }}>
                  <th style={{ padding: 8 }}>สินค้า</th>
                  <th style={{ padding: 8 }}>กก.</th>
                  <th style={{ padding: 8 }}>ราคา/กก.</th>
                  <th style={{ padding: 8 }}>ส่วนลด %</th>
                  <th style={{ padding: 8 }}>ส่วนลด</th>
                  <th style={{ padding: 8 }}>รวม</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} style={{ borderTop: '1px solid #eee' }}>
                    <td style={{ padding: 8 }}>{r.product_name}</td>
                    <td style={{ padding: 8 }}>{r.kg.toLocaleString()}</td>
                    <td style={{ padding: 8 }}>{r.unit_price.toLocaleString()}</td>
                    <td style={{ padding: 8 }}>{r.discount_percent}%</td>
                    <td style={{ padding: 8 }}>{r.discount_amount.toLocaleString()}</td>
                    <td style={{ padding: 8, fontWeight: 600 }}>{r.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, marginTop: 16, fontSize: 13 }}>
          <div>
            ยอดก่อนหักส่วนลด: <strong>{subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
          </div>
          <div>
            ส่วนลดรวม: <strong>{discountTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
          </div>
          <div>
            รวมทั้งสิ้น: <strong style={{ color: '#2d7a3a' }}>{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> {q.currency}
          </div>
        </div>
      </div>

      <div style={card}>
        <h3 style={{ color: '#2d4a3a', marginTop: 0 }}>หมายเหตุ / เงื่อนไข</h3>
        <p style={{ fontSize: 13, color: '#555' }}>หมายเหตุ: {q.notes ?? '-'}</p>
        <p style={{ fontSize: 13, color: '#555' }}>เงื่อนไข: {q.terms ?? '-'}</p>
      </div>

      <div style={card}>
        <h3 style={{ color: '#2d4a3a', marginTop: 0 }}>บันทึกกิจกรรมการขาย</h3>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <label>
            <span style={fieldLabel}>ประเภทกิจกรรม</span>
            <select value={activityType} onChange={(e) => setActivityType(e.target.value)} style={fieldInput}>
              <option value="phone_call">📞 โทรศัพท์</option>
              <option value="whatsapp">💬 WhatsApp</option>
              <option value="email">✉️ อีเมล</option>
              <option value="meeting">🤝 ประชุม</option>
              <option value="visit">🚗 เยี่ยมลูกค้า</option>
              <option value="sample_sent">📦 ส่งตัวอย่าง</option>
              <option value="quotation_sent">📝 ส่งใบเสนอราคา</option>
              <option value="follow_up">🔁 ติดตามงาน</option>
              <option value="note">🗒️ บันทึก</option>
            </select>
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            <span style={fieldLabel}>บันทึก</span>
            <input value={activityNote} onChange={(e) => setActivityNote(e.target.value)} style={fieldInput} placeholder="รายละเอียด..." />
          </label>
        </div>
        <button style={{ ...primaryButton, marginTop: 10 }} onClick={logActivity} disabled={busy}>
          บันทึกกิจกรรม
        </button>
      </div>
    </div>
  )
}
