'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  CUSTOMER_CATEGORY_LABELS,
  CUSTOMER_STATUS_LABELS,
  PIPELINE_STAGE_LABELS,
  TIMELINE_TYPE_LABELS,
  DOCUMENT_TYPE_LABELS,
  type Customer,
  type CustomerCategory,
  type CustomerStatus,
  type PipelineStage,
  type CustomerTimelineEntry,
  type CustomerDocument,
  type TimelineType,
  type DocumentType,
  type SalesRep,
} from '@/lib/crm/types'

const fieldLabel: React.CSSProperties = { fontSize: 11, color: '#6b8f5e', marginBottom: 4, display: 'block' }
const fieldInput: React.CSSProperties = { width: '100%', padding: '7px 9px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }
const primaryButton: React.CSSProperties = { background: '#2d7a3a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const secondaryButton: React.CSSProperties = { background: '#eef2ea', color: '#2d4a3a', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
const dangerButton: React.CSSProperties = { background: '#f5d6d6', color: '#9a2a2a', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
const card: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const badge: React.CSSProperties = { display: 'inline-block', padding: '3px 11px', borderRadius: 999, fontSize: 12, fontWeight: 600 }

const STATUS_COLORS: Record<CustomerStatus, { bg: string; fg: string }> = {
  pending: { bg: '#fdf3d6', fg: '#8a6d1f' },
  active: { bg: '#d9f0d4', fg: '#256029' },
  suspended: { bg: '#f0e0c8', fg: '#915c1c' },
  blacklisted: { bg: '#f5d6d6', fg: '#9a2a2a' },
  rejected: { bg: '#eee', fg: '#777' },
}

const CATEGORY_OPTIONS = Object.keys(CUSTOMER_CATEGORY_LABELS) as CustomerCategory[]
const PIPELINE_OPTIONS = Object.keys(PIPELINE_STAGE_LABELS) as PipelineStage[]
const TIMELINE_OPTIONS = Object.keys(TIMELINE_TYPE_LABELS) as TimelineType[]
const DOCUMENT_OPTIONS = Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]

export default function CustomerDetailManager({
  customer: initialCustomer,
  salesReps,
  initialTimeline,
  initialDocuments,
}: {
  customer: Customer
  salesReps: SalesRep[]
  initialTimeline: CustomerTimelineEntry[]
  initialDocuments: CustomerDocument[]
}) {
  const supabase = createClient()
  const [customer, setCustomer] = useState<Customer>(initialCustomer)
  const [timeline, setTimeline] = useState<CustomerTimelineEntry[]>(initialTimeline)
  const [documents, setDocuments] = useState<CustomerDocument[]>(initialDocuments)
  const [message, setMessage] = useState('')

  async function setStatus(status: CustomerStatus) {
    setMessage('')
    const { error } = await supabase.from('customers').update({ status }).eq('id', customer.id)
    if (error) {
      setMessage('ไม่สามารถเปลี่ยนสถานะได้')
      return
    }
    setCustomer((c) => ({ ...c, status }))
    setMessage(`เปลี่ยนสถานะเป็น "${CUSTOMER_STATUS_LABELS[status]}" แล้ว`)
  }

  async function resetPassword() {
    setMessage('')
    if (!customer.email) {
      setMessage('ลูกค้ารายนี้ไม่มีอีเมล')
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(customer.email)
    setMessage(error ? 'ไม่สามารถส่งอีเมลรีเซ็ตรหัสผ่านได้' : `ส่งอีเมลรีเซ็ตรหัสผ่านไปที่ ${customer.email} แล้ว`)
  }

  async function resetOtp() {
    setMessage('')
    if (!customer.email) {
      setMessage('ลูกค้ารายนี้ไม่มีอีเมล')
      return
    }
    const { error } = await supabase.auth.signInWithOtp({ email: customer.email })
    setMessage(error ? 'ไม่สามารถส่ง OTP ได้' : `ส่ง OTP ไปที่ ${customer.email} แล้ว`)
  }

  return (
    <div>
      <Link href="/admin/customers" style={{ color: '#6b8f5e', fontSize: 13, textDecoration: 'none' }}>
        ← กลับไปรายการลูกค้า
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '10px 0 20px' }}>
        <div>
          <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>{customer.company_name ?? customer.shop_name ?? customer.customer_code}</h1>
          <p style={{ color: '#6b8f5e' }}>รหัสลูกค้า: {customer.customer_code ?? '-'}</p>
        </div>
        <span style={{ ...badge, background: STATUS_COLORS[customer.status].bg, color: STATUS_COLORS[customer.status].fg }}>
          {CUSTOMER_STATUS_LABELS[customer.status]}
        </span>
      </div>

      {message && (
        <div style={{ ...card, padding: 10, background: '#eef2ea', color: '#2d4a3a', fontSize: 13 }}>{message}</div>
      )}

      <div style={card}>
        <h3 style={{ fontSize: 14, color: '#2d4a3a', marginBottom: 10 }}>การจัดการลูกค้า</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <button style={secondaryButton} onClick={() => setStatus('active')}>✅ อนุมัติ</button>
          <button style={secondaryButton} onClick={() => setStatus('rejected')}>🚫 ปฏิเสธ</button>
          <button style={secondaryButton} onClick={() => setStatus('suspended')}>⏸️ ระงับชั่วคราว</button>
          <button style={dangerButton} onClick={() => setStatus('blacklisted')}>⛔ บัญชีดำ</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={secondaryButton} onClick={resetPassword}>🔑 รีเซ็ตรหัสผ่าน</button>
          <button style={secondaryButton} onClick={resetOtp}>📧 ส่ง OTP</button>
        </div>
      </div>

      <ProfileForm supabase={supabase} customer={customer} salesReps={salesReps} onSaved={setCustomer} setMessage={setMessage} />

      <TimelineSection supabase={supabase} customerId={customer.id} timeline={timeline} setTimeline={setTimeline} />

      <DocumentsSection supabase={supabase} customerId={customer.id} documents={documents} setDocuments={setDocuments} />
    </div>
  )
}

function ProfileForm({
  supabase,
  customer,
  salesReps,
  onSaved,
  setMessage,
}: {
  supabase: ReturnType<typeof createClient>
  customer: Customer
  salesReps: SalesRep[]
  onSaved: (c: Customer) => void
  setMessage: (m: string) => void
}) {
  const [form, setForm] = useState({
    company_name: customer.company_name ?? '',
    shop_name: customer.shop_name ?? '',
    owner_name: customer.owner_name ?? '',
    contact_person: customer.contact_person ?? '',
    phone: customer.phone ?? '',
    whatsapp: customer.whatsapp ?? '',
    email: customer.email ?? '',
    tax_id: customer.tax_id ?? '',
    business_registration_number: customer.business_registration_number ?? '',
    country: customer.country ?? '',
    province: customer.province ?? '',
    district: customer.district ?? '',
    village: customer.village ?? '',
    billing_address: customer.billing_address ?? '',
    shipping_address: customer.shipping_address ?? '',
    google_map_url: customer.google_map_url ?? '',
    category: (customer.category ?? 'cafe') as CustomerCategory,
    pipeline_stage: customer.pipeline_stage,
    tier: customer.tier ?? '',
    payment_term: customer.payment_term ?? '',
    assigned_sales_rep: customer.assigned_sales_rep ?? '',
  })
  const [tagsInput, setTagsInput] = useState(customer.tags.join(', '))
  const [saving, setSaving] = useState(false)

  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const payload = {
      company_name: form.company_name || null,
      shop_name: form.shop_name || null,
      owner_name: form.owner_name || null,
      contact_person: form.contact_person || null,
      phone: form.phone || null,
      whatsapp: form.whatsapp || null,
      email: form.email || null,
      tax_id: form.tax_id || null,
      business_registration_number: form.business_registration_number || null,
      country: form.country || null,
      province: form.province || null,
      district: form.district || null,
      village: form.village || null,
      billing_address: form.billing_address || null,
      shipping_address: form.shipping_address || null,
      google_map_url: form.google_map_url || null,
      category: form.category,
      pipeline_stage: form.pipeline_stage,
      tier: form.tier || null,
      payment_term: form.payment_term || null,
      assigned_sales_rep: form.assigned_sales_rep || null,
      tags,
    }

    const { data, error } = await supabase.from('customers').update(payload).eq('id', customer.id).select('*').maybeSingle()

    setSaving(false)
    if (error || !data) {
      setMessage('ไม่สามารถบันทึกข้อมูลได้')
      return
    }
    onSaved(data as Customer)
    setMessage('บันทึกข้อมูลลูกค้าแล้ว')
  }

  return (
    <form onSubmit={handleSave} style={card}>
      <h3 style={{ fontSize: 14, color: '#2d4a3a', marginBottom: 10 }}>ข้อมูลลูกค้า</h3>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 10 }}>
        <label>
          <span style={fieldLabel}>ชื่อบริษัท</span>
          <input value={form.company_name} onChange={(e) => update('company_name', e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>ชื่อร้าน</span>
          <input value={form.shop_name} onChange={(e) => update('shop_name', e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>ชื่อเจ้าของ</span>
          <input value={form.owner_name} onChange={(e) => update('owner_name', e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>ผู้ติดต่อ</span>
          <input value={form.contact_person} onChange={(e) => update('contact_person', e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>เบอร์โทร</span>
          <input value={form.phone} onChange={(e) => update('phone', e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>WhatsApp</span>
          <input value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>อีเมล</span>
          <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>เลขผู้เสียภาษี</span>
          <input value={form.tax_id} onChange={(e) => update('tax_id', e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>เลขทะเบียนธุรกิจ</span>
          <input value={form.business_registration_number} onChange={(e) => update('business_registration_number', e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>ประเทศ</span>
          <input value={form.country} onChange={(e) => update('country', e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>จังหวัด</span>
          <input value={form.province} onChange={(e) => update('province', e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>อำเภอ/เขต</span>
          <input value={form.district} onChange={(e) => update('district', e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>หมู่บ้าน/ตำบล</span>
          <input value={form.village} onChange={(e) => update('village', e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>ประเภทลูกค้า</span>
          <select value={form.category} onChange={(e) => update('category', e.target.value as CustomerCategory)} style={fieldInput}>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {CUSTOMER_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span style={fieldLabel}>ขั้นตอนการขาย</span>
          <select value={form.pipeline_stage} onChange={(e) => update('pipeline_stage', e.target.value as PipelineStage)} style={fieldInput}>
            {PIPELINE_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {PIPELINE_STAGE_LABELS[p]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span style={fieldLabel}>ระดับลูกค้า (Tier)</span>
          <input value={form.tier} onChange={(e) => update('tier', e.target.value)} style={fieldInput} placeholder="เช่น Gold" />
        </label>
        <label>
          <span style={fieldLabel}>เงื่อนไขการชำระเงิน</span>
          <input value={form.payment_term} onChange={(e) => update('payment_term', e.target.value)} style={fieldInput} placeholder="เช่น Net 30" />
        </label>
        <label>
          <span style={fieldLabel}>เซลส์ที่ดูแล</span>
          <select value={form.assigned_sales_rep} onChange={(e) => update('assigned_sales_rep', e.target.value)} style={fieldInput}>
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
          <input value={form.billing_address} onChange={(e) => update('billing_address', e.target.value)} style={fieldInput} />
        </label>
        <label style={{ gridColumn: '1 / -1' }}>
          <span style={fieldLabel}>ที่อยู่จัดส่ง</span>
          <input value={form.shipping_address} onChange={(e) => update('shipping_address', e.target.value)} style={fieldInput} />
        </label>
        <label style={{ gridColumn: '1 / -1' }}>
          <span style={fieldLabel}>Google Map Location (URL)</span>
          <input value={form.google_map_url} onChange={(e) => update('google_map_url', e.target.value)} style={fieldInput} />
        </label>
      </div>
      <button type="submit" disabled={saving} style={primaryButton}>
        {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
      </button>
    </form>
  )
}

function TimelineSection({
  supabase,
  customerId,
  timeline,
  setTimeline,
}: {
  supabase: ReturnType<typeof createClient>
  customerId: string
  timeline: CustomerTimelineEntry[]
  setTimeline: React.Dispatch<React.SetStateAction<CustomerTimelineEntry[]>>
}) {
  const [interactionType, setInteractionType] = useState<TimelineType>('phone_call')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: userData } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('customer_timeline')
      .insert({
        customer_id: customerId,
        interaction_type: interactionType,
        note: note || null,
        created_by: userData.user?.id ?? null,
      })
      .select('*')
      .maybeSingle()
    setSaving(false)
    if (error || !data) return
    setTimeline((t) => [data as CustomerTimelineEntry, ...t])
    setNote('')
  }

  return (
    <div style={card}>
      <h3 style={{ fontSize: 14, color: '#2d4a3a', marginBottom: 10 }}>ไทม์ไลน์การติดต่อ</h3>
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <select value={interactionType} onChange={(e) => setInteractionType(e.target.value as TimelineType)} style={{ ...fieldInput, width: 'auto' }}>
          {TIMELINE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {TIMELINE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="บันทึกรายละเอียด..."
          style={{ ...fieldInput, flex: 1, minWidth: 200, width: 'auto' }}
        />
        <button type="submit" disabled={saving} style={primaryButton}>
          {saving ? 'กำลังบันทึก...' : '+ เพิ่ม'}
        </button>
      </form>

      {timeline.length === 0 ? (
        <p style={{ color: '#999', fontSize: 13 }}>ยังไม่มีบันทึกการติดต่อ</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {timeline.map((entry) => (
            <div key={entry.id} style={{ borderLeft: '3px solid #2d7a3a', paddingLeft: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#2d4a3a' }}>{TIMELINE_TYPE_LABELS[entry.interaction_type]}</div>
              {entry.note && <div style={{ fontSize: 13, color: '#555' }}>{entry.note}</div>}
              <div style={{ fontSize: 11, color: '#999' }}>{new Date(entry.occurred_at).toLocaleString('th-TH')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DocumentsSection({
  supabase,
  customerId,
  documents,
  setDocuments,
}: {
  supabase: ReturnType<typeof createClient>
  customerId: string
  documents: CustomerDocument[]
  setDocuments: React.Dispatch<React.SetStateAction<CustomerDocument[]>>
}) {
  const [docType, setDocType] = useState<DocumentType>('business_registration')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      setError('กรุณาเลือกไฟล์')
      return
    }
    setUploading(true)
    setError('')

    const { data: userData } = await supabase.auth.getUser()
    const path = `${customerId}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage.from('customer-documents').upload(path, file)
    if (uploadError) {
      setUploading(false)
      setError('ไม่สามารถอัปโหลดไฟล์ได้')
      return
    }

    const { data, error: insertError } = await supabase
      .from('customer_documents')
      .insert({
        customer_id: customerId,
        doc_type: docType,
        file_path: path,
        file_name: file.name,
        uploaded_by: userData.user?.id ?? null,
      })
      .select('*')
      .maybeSingle()

    setUploading(false)
    if (insertError || !data) {
      setError('ไม่สามารถบันทึกข้อมูลเอกสารได้')
      return
    }
    setDocuments((d) => [data as CustomerDocument, ...d])
    setFile(null)
  }

  async function viewDocument(filePath: string) {
    const { data } = await supabase.storage.from('customer-documents').createSignedUrl(filePath, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  return (
    <div style={card}>
      <h3 style={{ fontSize: 14, color: '#2d4a3a', marginBottom: 10 }}>เอกสารลูกค้า</h3>
      <form onSubmit={handleUpload} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <select value={docType} onChange={(e) => setDocType(e.target.value as DocumentType)} style={{ ...fieldInput, width: 'auto' }}>
          {DOCUMENT_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {DOCUMENT_TYPE_LABELS[d]}
            </option>
          ))}
        </select>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ fontSize: 13 }} />
        <button type="submit" disabled={uploading} style={primaryButton}>
          {uploading ? 'กำลังอัปโหลด...' : '+ อัปโหลด'}
        </button>
      </form>
      {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 8 }}>{error}</p>}

      {documents.length === 0 ? (
        <p style={{ color: '#999', fontSize: 13 }}>ยังไม่มีเอกสาร</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {documents.map((doc) => (
            <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2d4a3a' }}>{DOCUMENT_TYPE_LABELS[doc.doc_type]}</div>
                <div style={{ fontSize: 12, color: '#777' }}>{doc.file_name}</div>
              </div>
              <button style={secondaryButton} onClick={() => viewDocument(doc.file_path)}>
                ดูเอกสาร
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
