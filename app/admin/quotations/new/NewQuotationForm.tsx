'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  APPROVAL_DISCOUNT_THRESHOLD_PERCENT,
  QUOTATION_CURRENCIES,
  calcLineTotal,
  lineRequiresApproval,
  type QuotationCurrency,
} from '@/lib/sales/types'
import { publicPriceFor, tierPriceFor, todayDateString } from '@/lib/sales/data'
import type { Customer, SalesRep } from '@/lib/crm/types'
import type { Product } from '@/app/admin/products/ProductsManager'
import type { ProductTierPrice } from '@/lib/sales/types'

const fieldLabel: React.CSSProperties = { fontSize: 11, color: '#6b8f5e', marginBottom: 4, display: 'block' }
const fieldInput: React.CSSProperties = { width: '100%', padding: '7px 9px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }
const primaryButton: React.CSSProperties = { background: '#2d7a3a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const secondaryButton: React.CSSProperties = { background: '#eef2ea', color: '#2d4a3a', border: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
const card: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }

type CustomerPick = Pick<Customer, 'id' | 'customer_code' | 'company_name' | 'shop_name' | 'owner_name' | 'phone' | 'tier' | 'assigned_sales_rep' | 'status'>

type DraftItem = {
  key: string
  product_id: string | number | null
  product_name: string
  kg: number
  unit_price: number
  discount_percent: number
  discount_amount: number
}

function customerLabel(c: CustomerPick) {
  return c.company_name ?? c.shop_name ?? c.owner_name ?? c.customer_code ?? c.id
}

let keySeq = 0
function nextKey() {
  keySeq += 1
  return `item-${keySeq}`
}

export default function NewQuotationForm({
  customers,
  salesReps,
  products,
  tierPrices,
  currentUserId,
  currentUserRole,
}: {
  customers: CustomerPick[]
  salesReps: SalesRep[]
  products: Product[]
  tierPrices: ProductTierPrice[]
  currentUserId: string | null
  currentUserRole: string | null
}) {
  const router = useRouter()
  const supabase = createClient()

  const [customerId, setCustomerId] = useState('')
  const [salesRepId, setSalesRepId] = useState(currentUserRole === 'sales' ? currentUserId ?? '' : '')
  const [quotationDate, setQuotationDate] = useState(todayDateString())
  const [expiryDate, setExpiryDate] = useState('')
  const [currency, setCurrency] = useState<QuotationCurrency>('USD')
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('')
  const [items, setItems] = useState<DraftItem[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedCustomer = useMemo(() => customers.find((c) => c.id === customerId) ?? null, [customers, customerId])
  const productMap = useMemo(() => new Map(products.map((p) => [String(p.id), p])), [products])

  const defaultPriceFor = (productId: string | number) => {
    const product = productMap.get(String(productId))
    const tierPrice = selectedCustomer ? tierPriceFor(tierPrices, productId, selectedCustomer.tier, currency) : null
    return tierPrice ?? publicPriceFor(product, currency)
  }

  const addItem = () => {
    const first = products[0]
    if (!first) return
    setItems((prev) => [
      ...prev,
      {
        key: nextKey(),
        product_id: first.id,
        product_name: first.name,
        kg: 0,
        unit_price: defaultPriceFor(first.id),
        discount_percent: 0,
        discount_amount: 0,
      },
    ])
  }

  const updateItem = (key: string, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)))
  }

  const onProductChange = (key: string, productId: string) => {
    const product = productMap.get(productId)
    if (!product) return
    updateItem(key, { product_id: product.id, product_name: product.name, unit_price: defaultPriceFor(product.id) })
  }

  const removeItem = (key: string) => setItems((prev) => prev.filter((it) => it.key !== key))

  const rows = items.map((it) => {
    const tierPrice = selectedCustomer ? tierPriceFor(tierPrices, it.product_id ?? '', selectedCustomer.tier, currency) : null
    const total = calcLineTotal(it.kg, it.unit_price, it.discount_percent, it.discount_amount)
    const requiresApproval = lineRequiresApproval(it.unit_price, it.discount_percent, tierPrice)
    return { ...it, tierPrice, total, requiresApproval }
  })

  const subtotal = rows.reduce((sum, r) => sum + r.kg * r.unit_price, 0)
  const total = rows.reduce((sum, r) => sum + r.total, 0)
  const discountTotal = Math.max(0, subtotal - total)
  const anyRequiresApproval = rows.some((r) => r.requiresApproval)

  const save = async () => {
    setError('')
    if (!customerId) {
      setError('กรุณาเลือกลูกค้า')
      return
    }
    if (rows.length === 0) {
      setError('กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ')
      return
    }
    setSaving(true)

    const { data: quotation, error: qErr } = await supabase
      .from('quotations')
      .insert({
        customer_id: customerId,
        sales_rep_id: salesRepId || null,
        quotation_date: quotationDate,
        expiry_date: expiryDate || null,
        currency,
        status: 'draft',
        approval_status: anyRequiresApproval ? 'pending_approval' : 'not_required',
        subtotal,
        discount_total: discountTotal,
        total,
        notes: notes || null,
        terms: terms || null,
        created_by: currentUserId,
      })
      .select('id')
      .single()

    if (qErr || !quotation) {
      setError(qErr?.message ?? 'สร้างใบเสนอราคาไม่สำเร็จ')
      setSaving(false)
      return
    }

    const itemRows = rows.map((r, idx) => ({
      quotation_id: quotation.id,
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

    const { error: itemsErr } = await supabase.from('quotation_items').insert(itemRows)
    if (itemsErr) {
      setError(itemsErr.message)
      setSaving(false)
      return
    }

    router.push(`/admin/quotations/${quotation.id}`)
  }

  return (
    <div>
      <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>สร้างใบเสนอราคา</h1>
      <p style={{ color: '#6b8f5e', marginBottom: 20 }}>เลขที่ใบเสนอราคาจะถูกสร้างให้อัตโนมัติ</p>

      <div style={card}>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <label>
            <span style={fieldLabel}>ลูกค้า *</span>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} style={fieldInput}>
              <option value="">-- เลือกลูกค้า --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {customerLabel(c)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span style={fieldLabel}>เซลส์ผู้ดูแล</span>
            <select value={salesRepId} onChange={(e) => setSalesRepId(e.target.value)} style={fieldInput}>
              <option value="">-- ไม่ระบุ --</option>
              {salesReps.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name ?? s.id}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span style={fieldLabel}>วันที่เสนอราคา</span>
            <input type="date" value={quotationDate} onChange={(e) => setQuotationDate(e.target.value)} style={fieldInput} />
          </label>
          <label>
            <span style={fieldLabel}>วันหมดอายุ</span>
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} style={fieldInput} />
          </label>
          <label>
            <span style={fieldLabel}>สกุลเงิน</span>
            <select value={currency} onChange={(e) => setCurrency(e.target.value as QuotationCurrency)} style={fieldInput}>
              {QUOTATION_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
        {selectedCustomer?.tier && (
          <p style={{ fontSize: 12, color: '#6b8f5e', marginTop: 10 }}>Tier ของลูกค้านี้: {selectedCustomer.tier}</p>
        )}
      </div>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ color: '#2d4a3a', margin: 0 }}>รายการสินค้า</h3>
          <button style={secondaryButton} onClick={addItem} disabled={products.length === 0}>
            + เพิ่มรายการ
          </button>
        </div>

        {rows.length === 0 ? (
          <p style={{ color: '#999', fontSize: 13 }}>ยังไม่มีรายการสินค้า</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 760 }}>
              <thead>
                <tr style={{ background: '#f5f7f2', textAlign: 'left' }}>
                  <th style={{ padding: 8 }}>สินค้า</th>
                  <th style={{ padding: 8 }}>กก.</th>
                  <th style={{ padding: 8 }}>ราคา/กก.</th>
                  <th style={{ padding: 8 }}>ส่วนลด %</th>
                  <th style={{ padding: 8 }}>ส่วนลด (บาท)</th>
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
                      <input
                        type="number"
                        value={r.kg}
                        onChange={(e) => updateItem(r.key, { kg: Number(e.target.value) })}
                        style={{ ...fieldInput, width: 90 }}
                      />
                    </td>
                    <td style={{ padding: 8 }}>
                      <input
                        type="number"
                        value={r.unit_price}
                        onChange={(e) => updateItem(r.key, { unit_price: Number(e.target.value) })}
                        style={{
                          ...fieldInput,
                          width: 100,
                          borderColor: r.requiresApproval ? '#e0a23c' : '#ccc',
                          background: r.requiresApproval ? '#fff8ec' : '#fff',
                        }}
                      />
                      {r.tierPrice != null && <div style={{ fontSize: 11, color: '#999' }}>Tier: {r.tierPrice.toLocaleString()}</div>}
                    </td>
                    <td style={{ padding: 8 }}>
                      <input
                        type="number"
                        value={r.discount_percent}
                        onChange={(e) => updateItem(r.key, { discount_percent: Number(e.target.value) })}
                        style={{
                          ...fieldInput,
                          width: 80,
                          borderColor: r.discount_percent > APPROVAL_DISCOUNT_THRESHOLD_PERCENT ? '#e0a23c' : '#ccc',
                          background: r.discount_percent > APPROVAL_DISCOUNT_THRESHOLD_PERCENT ? '#fff8ec' : '#fff',
                        }}
                      />
                    </td>
                    <td style={{ padding: 8 }}>
                      <input
                        type="number"
                        value={r.discount_amount}
                        onChange={(e) => updateItem(r.key, { discount_amount: Number(e.target.value) })}
                        style={{ ...fieldInput, width: 90 }}
                      />
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
        )}

        {anyRequiresApproval && (
          <p style={{ fontSize: 12, color: '#915c1c', marginTop: 10, background: '#fff8ec', padding: 8, borderRadius: 6 }}>
            ⚠️ บางรายการมีส่วนลดเกิน {APPROVAL_DISCOUNT_THRESHOLD_PERCENT}% หรือราคาต่ำกว่า Tier — ใบเสนอราคานี้จะต้องรอการอนุมัติจากผู้ดูแล
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, marginTop: 16, fontSize: 13 }}>
          <div>
            ยอดก่อนหักส่วนลด: <strong>{subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
          </div>
          <div>
            ส่วนลดรวม: <strong>{discountTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
          </div>
          <div>
            รวมทั้งสิ้น: <strong style={{ color: '#2d7a3a' }}>{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> {currency}
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          <label>
            <span style={fieldLabel}>หมายเหตุ</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...fieldInput, minHeight: 70 }} />
          </label>
          <label>
            <span style={fieldLabel}>เงื่อนไข / Terms</span>
            <textarea value={terms} onChange={(e) => setTerms(e.target.value)} style={{ ...fieldInput, minHeight: 70 }} />
          </label>
        </div>
      </div>

      {error && <p style={{ color: '#c0392b', marginBottom: 12 }}>{error}</p>}

      <button style={primaryButton} onClick={save} disabled={saving}>
        {saving ? 'กำลังบันทึก...' : 'บันทึกใบเสนอราคา'}
      </button>
    </div>
  )
}
