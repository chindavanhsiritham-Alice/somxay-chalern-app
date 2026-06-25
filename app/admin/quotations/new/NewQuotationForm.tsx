'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  APPROVAL_DISCOUNT_THRESHOLD_PERCENT,
  QUOTATION_CURRENCIES,
  calcLineNet,
  calcLineTax,
  calcLineTotal,
  lineRequiresApproval,
  type QuotationCurrency,
} from '@/lib/sales/types'
import { publicPriceFor, tierPriceFor, todayDateString } from '@/lib/sales/data'
import type { SalesRep } from '@/lib/crm/types'
import type { Product } from '@/app/admin/products/ProductsManager'
import type { ProductTierPrice } from '@/lib/sales/types'
import CustomerCombobox, { type CustomerOption } from '../CustomerCombobox'

const fieldLabel: React.CSSProperties = { fontSize: 11, color: '#6b8f5e', marginBottom: 4, display: 'block' }
const fieldInput: React.CSSProperties = { width: '100%', padding: '9px 10px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }
const primaryButton: React.CSSProperties = { background: '#2d7a3a', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const addItemButton: React.CSSProperties = {
  background: '#2d7a3a',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '12px 18px',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  width: '100%',
}
const secondaryButton: React.CSSProperties = { background: '#eef2ea', color: '#2d4a3a', border: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
const card: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const itemCard: React.CSSProperties = { background: '#fafbf9', border: '1px solid #e6ebe3', borderRadius: 10, padding: 14, marginBottom: 12 }

type DraftItem = {
  key: string
  product_id: string | number | null
  product_name: string
  kg: number
  unit_price: number
  discount_percent: number
  discount_amount: number
  tax_percent: number
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
  customers: CustomerOption[]
  salesReps: SalesRep[]
  products: Product[]
  tierPrices: ProductTierPrice[]
  currentUserId: string | null
  currentUserRole: string | null
}) {
  const router = useRouter()
  const supabase = createClient()

  const isSales = currentUserRole === 'sales'

  const [customerId, setCustomerId] = useState('')
  const [salesRepId, setSalesRepId] = useState(currentUserId ?? '')
  const [quotationDate, setQuotationDate] = useState(todayDateString())
  const [expiryDate, setExpiryDate] = useState('')
  const [currency, setCurrency] = useState<QuotationCurrency>('USD')
  const [freight, setFreight] = useState(0)
  const [insurance, setInsurance] = useState(0)
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('')
  const [items, setItems] = useState<DraftItem[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ customer?: string; items?: string }>({})

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
        tax_percent: 0,
      },
    ])
    setFieldErrors((prev) => ({ ...prev, items: undefined }))
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
    const lineNet = calcLineNet(it.kg, it.unit_price, it.discount_percent, it.discount_amount)
    const taxAmount = calcLineTax(lineNet, it.tax_percent)
    const total = calcLineTotal(it.kg, it.unit_price, it.discount_percent, it.discount_amount, it.tax_percent)
    const requiresApproval = lineRequiresApproval(it.unit_price, it.discount_percent, tierPrice)
    return { ...it, tierPrice, lineNet, taxAmount, total, requiresApproval }
  })

  const subtotal = rows.reduce((sum, r) => sum + r.kg * r.unit_price, 0)
  const lineNetTotal = rows.reduce((sum, r) => sum + r.lineNet, 0)
  const discountTotal = Math.max(0, subtotal - lineNetTotal)
  const taxTotal = rows.reduce((sum, r) => sum + r.taxAmount, 0)
  const grandTotal = lineNetTotal + taxTotal + freight + insurance
  const anyRequiresApproval = rows.some((r) => r.requiresApproval)

  const save = async () => {
    setError('')
    const nextFieldErrors: { customer?: string; items?: string } = {}
    if (!customerId) nextFieldErrors.customer = 'กรุณาเลือกลูกค้าก่อนบันทึก'
    if (rows.length === 0) nextFieldErrors.items = 'กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ'
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      setError('กรุณาแก้ไขข้อมูลที่ไม่ครบถ้วนก่อนบันทึก')
      return
    }
    setFieldErrors({})
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
        tax_total: taxTotal,
        freight,
        insurance,
        total: grandTotal,
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
      tax_percent: r.tax_percent,
      tax_amount: r.taxAmount,
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
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <label style={{ gridColumn: 'span 2' }}>
            <span style={fieldLabel}>ลูกค้า *</span>
            <CustomerCombobox customers={customers} value={customerId} onChange={setCustomerId} error={fieldErrors.customer} />
          </label>
          <label>
            <span style={fieldLabel}>เซลส์ผู้ดูแล</span>
            {isSales ? (
              <div style={{ ...fieldInput, background: '#f5f7f2', color: '#2d4a3a', fontWeight: 600 }}>
                {salesReps.find((s) => s.id === currentUserId)?.full_name ?? 'ฉัน'}
              </div>
            ) : (
              <select value={salesRepId} onChange={(e) => setSalesRepId(e.target.value)} style={fieldInput}>
                <option value="">-- ไม่ระบุ --</option>
                {salesReps.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name ?? s.id}
                    {s.id === currentUserId ? ' (ฉัน)' : ''}
                  </option>
                ))}
              </select>
            )}
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
        </div>

        {rows.length === 0 ? (
          <p style={{ color: fieldErrors.items ? '#c0392b' : '#999', fontSize: 13 }}>
            {fieldErrors.items ?? 'ยังไม่มีรายการสินค้า — กดปุ่มด้านล่างเพื่อเริ่มเพิ่มรายการ'}
          </p>
        ) : (
          <div>
            {rows.map((r) => (
              <div key={r.key} style={itemCard}>
                <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
                  <label style={{ gridColumn: 'span 2' }}>
                    <span style={fieldLabel}>สินค้า</span>
                    <select value={String(r.product_id ?? '')} onChange={(e) => onProductChange(r.key, e.target.value)} style={fieldInput}>
                      {products.map((p) => (
                        <option key={String(p.id)} value={String(p.id)}>
                          {p.name} {p.grade ? `(${p.grade})` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span style={fieldLabel}>จำนวน (กก.)</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={r.kg}
                      onChange={(e) => updateItem(r.key, { kg: Number(e.target.value) })}
                      style={fieldInput}
                    />
                  </label>
                  <label>
                    <span style={fieldLabel}>ราคา/กก.</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={r.unit_price}
                      onChange={(e) => updateItem(r.key, { unit_price: Number(e.target.value) })}
                      style={{
                        ...fieldInput,
                        borderColor: r.requiresApproval ? '#e0a23c' : '#ccc',
                        background: r.requiresApproval ? '#fff8ec' : '#fff',
                      }}
                    />
                    {r.tierPrice != null && <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>Tier: {r.tierPrice.toLocaleString()}</div>}
                  </label>
                  <label>
                    <span style={fieldLabel}>ส่วนลด %</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={r.discount_percent}
                      onChange={(e) => updateItem(r.key, { discount_percent: Number(e.target.value) })}
                      style={{
                        ...fieldInput,
                        borderColor: r.discount_percent > APPROVAL_DISCOUNT_THRESHOLD_PERCENT ? '#e0a23c' : '#ccc',
                        background: r.discount_percent > APPROVAL_DISCOUNT_THRESHOLD_PERCENT ? '#fff8ec' : '#fff',
                      }}
                    />
                  </label>
                  <label>
                    <span style={fieldLabel}>ส่วนลด (จำนวนเงิน)</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={r.discount_amount}
                      onChange={(e) => updateItem(r.key, { discount_amount: Number(e.target.value) })}
                      style={fieldInput}
                    />
                  </label>
                  <label>
                    <span style={fieldLabel}>ภาษี %</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={r.tax_percent}
                      onChange={(e) => updateItem(r.key, { tax_percent: Number(e.target.value) })}
                      style={fieldInput}
                    />
                  </label>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <span style={{ fontSize: 13, color: '#2d4a3a' }}>
                    รวมรายการนี้: <strong style={{ color: '#2d7a3a' }}>{r.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                  </span>
                  <button style={secondaryButton} onClick={() => removeItem(r.key)}>
                    🗑️ ลบรายการ
                  </button>
                </div>
                {r.requiresApproval && (
                  <p style={{ fontSize: 11, color: '#915c1c', marginTop: 6, marginBottom: 0 }}>⚠️ รายการนี้ต้องรอการอนุมัติ</p>
                )}
              </div>
            ))}
          </div>
        )}

        <button style={addItemButton} onClick={addItem} disabled={products.length === 0}>
          ➕ เพิ่มรายการสินค้า
        </button>
        {products.length === 0 && (
          <p style={{ color: '#c0392b', fontSize: 12, marginTop: 8 }}>ไม่มีสินค้าในระบบ — กรุณาเพิ่มสินค้าก่อนสร้างใบเสนอราคา</p>
        )}

        {anyRequiresApproval && (
          <p style={{ fontSize: 12, color: '#915c1c', marginTop: 14, background: '#fff8ec', padding: 8, borderRadius: 6 }}>
            ⚠️ บางรายการมีส่วนลดเกิน {APPROVAL_DISCOUNT_THRESHOLD_PERCENT}% หรือราคาต่ำกว่า Tier — ใบเสนอราคานี้จะต้องรอการอนุมัติจากผู้ดูแล
          </p>
        )}
      </div>

      <div style={card}>
        <h3 style={{ color: '#2d4a3a', marginTop: 0, marginBottom: 12 }}>ค่าใช้จ่ายเพิ่มเติม</h3>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 16 }}>
          <label>
            <span style={fieldLabel}>ค่าขนส่ง (Freight)</span>
            <input type="number" inputMode="decimal" value={freight} onChange={(e) => setFreight(Number(e.target.value))} style={fieldInput} />
          </label>
          <label>
            <span style={fieldLabel}>ค่าประกัน (Insurance)</span>
            <input type="number" inputMode="decimal" value={insurance} onChange={(e) => setInsurance(Number(e.target.value))} style={fieldInput} />
          </label>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', fontSize: 13 }}>
          <div>
            ยอดก่อนหักส่วนลด: <strong>{subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
          </div>
          <div>
            ส่วนลดรวม: <strong>{discountTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
          </div>
          <div>
            ภาษีรวม: <strong>{taxTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
          </div>
          <div>
            ค่าขนส่ง: <strong>{freight.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
          </div>
          <div>
            ค่าประกัน: <strong>{insurance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
          </div>
          <div style={{ fontSize: 16, borderTop: '2px solid #2d7a3a', paddingTop: 6, marginTop: 4 }}>
            รวมทั้งสิ้น: <strong style={{ color: '#2d7a3a' }}>{grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> {currency}
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
