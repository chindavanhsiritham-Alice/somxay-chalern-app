'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  CUSTOMER_CATEGORY_LABELS,
  CUSTOMER_STATUS_LABELS,
  PIPELINE_STAGE_LABELS,
  generateCustomerCode,
  type Customer,
  type CustomerCategory,
  type CustomerStatus,
  type PipelineStage,
  type SalesRep,
} from '@/lib/crm/types'
import { CUSTOMERS_PAGE_SIZE } from '@/lib/crm/data'

const fieldLabel: React.CSSProperties = { fontSize: 11, color: '#6b8f5e', marginBottom: 4, display: 'block' }
const fieldInput: React.CSSProperties = { width: '100%', padding: '7px 9px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }
const primaryButton: React.CSSProperties = { background: '#2d7a3a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const secondaryButton: React.CSSProperties = { background: '#eef2ea', color: '#2d4a3a', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const th: React.CSSProperties = { padding: '10px 14px', fontWeight: 600, color: '#2d4a3a', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '10px 14px', color: '#444' }
const badge: React.CSSProperties = { display: 'inline-block', padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600 }

const STATUS_COLORS: Record<CustomerStatus, { bg: string; fg: string }> = {
  pending: { bg: '#fdf3d6', fg: '#8a6d1f' },
  active: { bg: '#d9f0d4', fg: '#256029' },
  suspended: { bg: '#f0e0c8', fg: '#915c1c' },
  blacklisted: { bg: '#f5d6d6', fg: '#9a2a2a' },
  rejected: { bg: '#eee', fg: '#777' },
}

const CATEGORY_OPTIONS = Object.keys(CUSTOMER_CATEGORY_LABELS) as CustomerCategory[]
const STATUS_OPTIONS = Object.keys(CUSTOMER_STATUS_LABELS) as CustomerStatus[]
const PIPELINE_OPTIONS = Object.keys(PIPELINE_STAGE_LABELS) as PipelineStage[]

export default function CustomersListManager({
  initialCustomers,
  initialCount,
  salesReps,
}: {
  initialCustomers: Customer[]
  initialCount: number
  salesReps: SalesRep[]
}) {
  const supabase = createClient()
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [count, setCount] = useState(initialCount)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [pipelineStage, setPipelineStage] = useState('')
  const [tag, setTag] = useState('')
  const [salesRepId, setSalesRepId] = useState('')

  const isFirstRender = useRef(true)

  const fetchPage = useCallback(
    async (pageIndex: number) => {
      setLoading(true)
      let query = supabase.from('customers').select('*', { count: 'exact' })

      const safeSearch = search.trim().replace(/[,()%]/g, '')
      if (safeSearch) {
        query = query.or(
          `company_name.ilike.%${safeSearch}%,owner_name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%,province.ilike.%${safeSearch}%`
        )
      }
      if (category) query = query.eq('category', category)
      if (status) query = query.eq('status', status)
      if (pipelineStage) query = query.eq('pipeline_stage', pipelineStage)
      if (salesRepId) query = query.eq('assigned_sales_rep', salesRepId)
      if (tag.trim()) query = query.overlaps('tags', [tag.trim()])

      const from = pageIndex * CUSTOMERS_PAGE_SIZE
      const to = from + CUSTOMERS_PAGE_SIZE - 1
      const { data, count: total } = await query.order('created_at', { ascending: false }).range(from, to)

      setCustomers((data ?? []) as Customer[])
      setCount(total ?? 0)
      setPage(pageIndex)
      setLoading(false)
    },
    [supabase, search, category, status, pipelineStage, tag, salesRepId]
  )

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const timer = setTimeout(() => fetchPage(0), 300)
    return () => clearTimeout(timer)
  }, [fetchPage])

  const salesRepName = (id: string | null) => salesReps.find((s) => s.id === id)?.full_name ?? '-'
  const totalPages = Math.max(1, Math.ceil(count / CUSTOMERS_PAGE_SIZE))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>Customer Management</h1>
          <p style={{ color: '#6b8f5e', marginBottom: 20 }}>{count.toLocaleString()} ลูกค้าทั้งหมด</p>
        </div>
        <button style={primaryButton} onClick={() => setShowAddForm((v) => !v)}>
          {showAddForm ? 'ปิดฟอร์ม' : '+ เพิ่มลูกค้าใหม่'}
        </button>
      </div>

      {showAddForm && (
        <AddCustomerForm
          supabase={supabase}
          salesReps={salesReps}
          onCreated={() => {
            setShowAddForm(false)
            fetchPage(0)
          }}
        />
      )}

      <div style={{ background: '#fff', borderRadius: 12, padding: 14, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <label>
            <span style={fieldLabel}>ค้นหา (บริษัท / เจ้าของ / เบอร์โทร / จังหวัด)</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} style={fieldInput} placeholder="ค้นหา..." />
          </label>
          <label>
            <span style={fieldLabel}>ประเภทลูกค้า</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={fieldInput}>
              <option value="">ทั้งหมด</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {CUSTOMER_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span style={fieldLabel}>สถานะ</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={fieldInput}>
              <option value="">ทั้งหมด</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {CUSTOMER_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span style={fieldLabel}>ขั้นตอนการขาย</span>
            <select value={pipelineStage} onChange={(e) => setPipelineStage(e.target.value)} style={fieldInput}>
              <option value="">ทั้งหมด</option>
              {PIPELINE_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {PIPELINE_STAGE_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span style={fieldLabel}>แท็ก</span>
            <input value={tag} onChange={(e) => setTag(e.target.value)} style={fieldInput} placeholder="เช่น VIP" />
          </label>
          <label>
            <span style={fieldLabel}>เซลส์ที่ดูแล</span>
            <select value={salesRepId} onChange={(e) => setSalesRepId(e.target.value)} style={fieldInput}>
              <option value="">ทั้งหมด</option>
              {salesReps.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name ?? s.id}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#999' }}>กำลังโหลด...</p>
      ) : customers.length === 0 ? (
        <p style={{ color: '#999' }}>ไม่พบลูกค้า</p>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f7f2', textAlign: 'left' }}>
                <th style={th}>รหัสลูกค้า</th>
                <th style={th}>บริษัท / ร้าน</th>
                <th style={th}>เจ้าของ</th>
                <th style={th}>เบอร์โทร</th>
                <th style={th}>จังหวัด</th>
                <th style={th}>ประเภท</th>
                <th style={th}>แท็ก</th>
                <th style={th}>สถานะ</th>
                <th style={th}>Pipeline</th>
                <th style={th}>เซลส์</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>
                    <Link href={`/admin/customers/${c.id}`} style={{ color: '#2d7a3a', fontWeight: 600, textDecoration: 'none' }}>
                      {c.customer_code ?? '-'}
                    </Link>
                  </td>
                  <td style={td}>{c.company_name ?? c.shop_name ?? '-'}</td>
                  <td style={td}>{c.owner_name ?? '-'}</td>
                  <td style={td}>{c.phone ?? '-'}</td>
                  <td style={td}>{c.province ?? '-'}</td>
                  <td style={td}>{c.category ? CUSTOMER_CATEGORY_LABELS[c.category] : '-'}</td>
                  <td style={td}>
                    {c.tags.length === 0 ? (
                      '-'
                    ) : (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {c.tags.map((t) => (
                          <span key={t} style={{ ...badge, background: '#eef2ea', color: '#2d4a3a' }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={td}>
                    <span style={{ ...badge, background: STATUS_COLORS[c.status].bg, color: STATUS_COLORS[c.status].fg }}>
                      {CUSTOMER_STATUS_LABELS[c.status]}
                    </span>
                  </td>
                  <td style={td}>{PIPELINE_STAGE_LABELS[c.pipeline_stage]}</td>
                  <td style={td}>{salesRepName(c.assigned_sales_rep)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {count > CUSTOMERS_PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <button style={secondaryButton} disabled={page <= 0 || loading} onClick={() => fetchPage(page - 1)}>
            ← ก่อนหน้า
          </button>
          <span style={{ fontSize: 13, color: '#555' }}>
            หน้า {page + 1} / {totalPages}
          </span>
          <button style={secondaryButton} disabled={page + 1 >= totalPages || loading} onClick={() => fetchPage(page + 1)}>
            ถัดไป →
          </button>
        </div>
      )}
    </div>
  )
}

function AddCustomerForm({
  supabase,
  salesReps,
  onCreated,
}: {
  supabase: ReturnType<typeof createClient>
  salesReps: SalesRep[]
  onCreated: () => void
}) {
  const [companyName, setCompanyName] = useState('')
  const [shopName, setShopName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [taxId, setTaxId] = useState('')
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState('')
  const [country, setCountry] = useState('Laos')
  const [province, setProvince] = useState('')
  const [district, setDistrict] = useState('')
  const [village, setVillage] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [googleMapUrl, setGoogleMapUrl] = useState('')
  const [category, setCategory] = useState<CustomerCategory>('cafe')
  const [tagsInput, setTagsInput] = useState('')
  const [assignedSalesRep, setAssignedSalesRep] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!companyName.trim() && !shopName.trim()) {
      setError('กรุณากรอกชื่อบริษัทหรือชื่อร้าน')
      return
    }
    setSaving(true)

    const { data: userData } = await supabase.auth.getUser()
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const { error: insertError } = await supabase.from('customers').insert({
      customer_code: generateCustomerCode(),
      company_name: companyName || null,
      shop_name: shopName || null,
      owner_name: ownerName || null,
      contact_person: contactPerson || null,
      phone: phone || null,
      whatsapp: whatsapp || null,
      email: email || null,
      tax_id: taxId || null,
      business_registration_number: businessRegistrationNumber || null,
      country: country || null,
      province: province || null,
      district: district || null,
      village: village || null,
      billing_address: billingAddress || null,
      shipping_address: shippingAddress || null,
      google_map_url: googleMapUrl || null,
      category,
      tags,
      status: 'active',
      pipeline_stage: 'lead',
      assigned_sales_rep: assignedSalesRep || null,
      created_by: userData.user?.id ?? null,
    })

    setSaving(false)
    if (insertError) {
      setError('ไม่สามารถบันทึกลูกค้าได้')
      return
    }
    onCreated()
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <h3 style={{ fontSize: 14, color: '#2d4a3a', marginBottom: 10 }}>เพิ่มลูกค้าใหม่</h3>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 10 }}>
        <label>
          <span style={fieldLabel}>ชื่อบริษัท</span>
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>ชื่อร้าน</span>
          <input value={shopName} onChange={(e) => setShopName(e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>ชื่อเจ้าของ</span>
          <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>ผู้ติดต่อ</span>
          <input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>เบอร์โทร</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>WhatsApp</span>
          <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>อีเมล</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>เลขผู้เสียภาษี</span>
          <input value={taxId} onChange={(e) => setTaxId(e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>เลขทะเบียนธุรกิจ</span>
          <input value={businessRegistrationNumber} onChange={(e) => setBusinessRegistrationNumber(e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>ประเทศ</span>
          <input value={country} onChange={(e) => setCountry(e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>จังหวัด</span>
          <input value={province} onChange={(e) => setProvince(e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>อำเภอ/เขต</span>
          <input value={district} onChange={(e) => setDistrict(e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>หมู่บ้าน/ตำบล</span>
          <input value={village} onChange={(e) => setVillage(e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>ประเภทลูกค้า</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as CustomerCategory)} style={fieldInput}>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {CUSTOMER_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span style={fieldLabel}>เซลส์ที่ดูแล</span>
          <select value={assignedSalesRep} onChange={(e) => setAssignedSalesRep(e.target.value)} style={fieldInput}>
            <option value="">— ไม่ระบุ —</option>
            {salesReps.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name ?? s.id}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span style={fieldLabel}>แท็ก (คั่นด้วยจุลภาค)</span>
          <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} style={fieldInput} placeholder="VIP, Wholesale" />
        </label>
        <label style={{ gridColumn: '1 / -1' }}>
          <span style={fieldLabel}>ที่อยู่สำหรับวางบิล</span>
          <input value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} style={fieldInput} />
        </label>
        <label style={{ gridColumn: '1 / -1' }}>
          <span style={fieldLabel}>ที่อยู่จัดส่ง</span>
          <input value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} style={fieldInput} />
        </label>
        <label style={{ gridColumn: '1 / -1' }}>
          <span style={fieldLabel}>Google Map Location (URL)</span>
          <input value={googleMapUrl} onChange={(e) => setGoogleMapUrl(e.target.value)} style={fieldInput} />
        </label>
      </div>
      {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 8 }}>{error}</p>}
      <button type="submit" disabled={saving} style={primaryButton}>
        {saving ? 'กำลังบันทึก...' : 'บันทึกลูกค้า'}
      </button>
    </form>
  )
}
