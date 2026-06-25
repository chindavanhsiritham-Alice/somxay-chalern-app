'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  CUSTOMER_CATEGORY_LABELS,
  CUSTOMER_STATUS_LABELS,
  PIPELINE_STAGE_LABELS,
  TIMELINE_TYPE_LABELS,
  DOCUMENT_TYPE_LABELS,
  generateCustomerCode,
  type Customer,
  type CustomerCategory,
  type CustomerTimelineEntry,
  type CustomerDocument,
  type DocumentType,
} from '@/lib/crm/types'

const fieldLabel: React.CSSProperties = { fontSize: 11, color: '#6b8f5e', marginBottom: 4, display: 'block' }
const fieldInput: React.CSSProperties = { width: '100%', padding: '7px 9px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }
const primaryButton: React.CSSProperties = { background: '#2d7a3a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const secondaryButton: React.CSSProperties = { background: '#eef2ea', color: '#2d4a3a', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
const card: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const badge: React.CSSProperties = { display: 'inline-block', padding: '3px 11px', borderRadius: 999, fontSize: 12, fontWeight: 600 }

const CATEGORY_OPTIONS = Object.keys(CUSTOMER_CATEGORY_LABELS) as CustomerCategory[]
const DOCUMENT_OPTIONS = Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]

const FORM_FIELDS: { key: keyof typeof EMPTY_FORM; label: string; full?: boolean }[] = [
  { key: 'company_name', label: 'Company Name' },
  { key: 'shop_name', label: 'Shop Name' },
  { key: 'owner_name', label: 'Owner Name' },
  { key: 'contact_person', label: 'Contact Person' },
  { key: 'phone', label: 'Phone' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'email', label: 'Email' },
  { key: 'tax_id', label: 'Tax ID' },
  { key: 'business_registration_number', label: 'Business Registration No.' },
  { key: 'country', label: 'Country' },
  { key: 'province', label: 'Province' },
  { key: 'district', label: 'District' },
  { key: 'village', label: 'Village' },
  { key: 'billing_address', label: 'Billing Address', full: true },
  { key: 'shipping_address', label: 'Shipping Address', full: true },
  { key: 'google_map_url', label: 'Google Map Location (URL)', full: true },
]

const EMPTY_FORM = {
  company_name: '',
  shop_name: '',
  owner_name: '',
  contact_person: '',
  phone: '',
  whatsapp: '',
  email: '',
  tax_id: '',
  business_registration_number: '',
  country: 'Laos',
  province: '',
  district: '',
  village: '',
  billing_address: '',
  shipping_address: '',
  google_map_url: '',
}

export default function PortalProfileManager({
  userId,
  userEmail,
  customer: initialCustomer,
  timeline,
  documents: initialDocuments,
}: {
  userId: string
  userEmail: string | null
  customer: Customer | null
  timeline: CustomerTimelineEntry[]
  documents: CustomerDocument[]
}) {
  const supabase = createClient()
  const [customer, setCustomer] = useState<Customer | null>(initialCustomer)
  const [documents, setDocuments] = useState<CustomerDocument[]>(initialDocuments)

  if (!customer) {
    return (
      <CompleteProfileForm
        supabase={supabase}
        userId={userId}
        userEmail={userEmail}
        onCreated={(c) => setCustomer(c)}
      />
    )
  }

  return (
    <div>
      <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>My Profile</h1>
      <p style={{ color: '#6b8f5e', marginBottom: 20 }}>Customer Code: {customer.customer_code ?? '-'}</p>

      <div style={card}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <StatusInfo label="Status" value={CUSTOMER_STATUS_LABELS[customer.status]} />
          <StatusInfo label="Pipeline Stage" value={PIPELINE_STAGE_LABELS[customer.pipeline_stage]} />
          <StatusInfo label="Tier" value={customer.tier ?? '-'} />
          <StatusInfo label="Payment Term" value={customer.payment_term ?? '-'} />
        </div>
      </div>

      <EditProfileForm supabase={supabase} customer={customer} onSaved={setCustomer} />

      <div style={card}>
        <h3 style={{ fontSize: 14, color: '#2d4a3a', marginBottom: 10 }}>Interaction History</h3>
        {timeline.length === 0 ? (
          <p style={{ color: '#999', fontSize: 13 }}>No interactions recorded yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {timeline.map((entry) => (
              <div key={entry.id} style={{ borderLeft: '3px solid #2d7a3a', paddingLeft: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2d4a3a' }}>{TIMELINE_TYPE_LABELS[entry.interaction_type]}</div>
                {entry.note && <div style={{ fontSize: 13, color: '#555' }}>{entry.note}</div>}
                <div style={{ fontSize: 11, color: '#999' }}>{new Date(entry.occurred_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DocumentsSection supabase={supabase} customerId={customer.id} documents={documents} setDocuments={setDocuments} />
    </div>
  )
}

function StatusInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={fieldLabel}>{label}</div>
      <div style={{ ...badge, background: '#eef2ea', color: '#2d4a3a' }}>{value}</div>
    </div>
  )
}

function CompleteProfileForm({
  supabase,
  userId,
  userEmail,
  onCreated,
}: {
  supabase: ReturnType<typeof createClient>
  userId: string
  userEmail: string | null
  onCreated: (c: Customer) => void
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, email: userEmail ?? '' })
  const [category, setCategory] = useState<CustomerCategory>('cafe')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.company_name.trim() && !form.shop_name.trim()) {
      setError('Please enter a company name or shop name.')
      return
    }
    setSaving(true)

    const payload: Record<string, string | null> = {}
    for (const k of Object.keys(EMPTY_FORM) as (keyof typeof EMPTY_FORM)[]) {
      payload[k] = form[k] || null
    }

    const { data, error: insertError } = await supabase
      .from('customers')
      .insert({
        ...payload,
        category,
        customer_code: generateCustomerCode(),
        profile_id: userId,
        status: 'pending',
        pipeline_stage: 'lead',
      })
      .select('*')
      .maybeSingle()

    setSaving(false)
    if (insertError || !data) {
      setError('Could not save your profile. Please try again.')
      return
    }
    onCreated(data as Customer)
  }

  return (
    <div>
      <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>Complete Your Profile</h1>
      <p style={{ color: '#6b8f5e', marginBottom: 20 }}>Tell us about your business to get started.</p>

      <form onSubmit={handleSubmit} style={card}>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 10 }}>
          {FORM_FIELDS.map((f) => (
            <label key={f.key} style={f.full ? { gridColumn: '1 / -1' } : undefined}>
              <span style={fieldLabel}>{f.label}</span>
              <input value={form[f.key]} onChange={(e) => update(f.key, e.target.value)} style={fieldInput} />
            </label>
          ))}
          <label>
            <span style={fieldLabel}>Business Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as CustomerCategory)} style={fieldInput}>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {CUSTOMER_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 8 }}>{error}</p>}
        <button type="submit" disabled={saving} style={primaryButton}>
          {saving ? 'Saving...' : 'Submit Profile'}
        </button>
      </form>
    </div>
  )
}

function EditProfileForm({
  supabase,
  customer,
  onSaved,
}: {
  supabase: ReturnType<typeof createClient>
  customer: Customer
  onSaved: (c: Customer) => void
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
  })
  const [category, setCategory] = useState<CustomerCategory>((customer.category ?? 'cafe') as CustomerCategory)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const payload: Record<string, string | null> = { category }
    for (const k of Object.keys(form) as (keyof typeof form)[]) {
      payload[k] = form[k] || null
    }

    const { data, error } = await supabase.from('customers').update(payload).eq('id', customer.id).select('*').maybeSingle()

    setSaving(false)
    if (error || !data) {
      setMessage('Could not save your changes.')
      return
    }
    onSaved(data as Customer)
    setMessage('Profile updated.')
  }

  return (
    <form onSubmit={handleSave} style={card}>
      <h3 style={{ fontSize: 14, color: '#2d4a3a', marginBottom: 10 }}>Edit Profile</h3>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 10 }}>
        {FORM_FIELDS.map((f) => (
          <label key={f.key} style={f.full ? { gridColumn: '1 / -1' } : undefined}>
            <span style={fieldLabel}>{f.label}</span>
            <input value={form[f.key]} onChange={(e) => update(f.key, e.target.value)} style={fieldInput} />
          </label>
        ))}
        <label>
          <span style={fieldLabel}>Business Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as CustomerCategory)} style={fieldInput}>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {CUSTOMER_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {message && <p style={{ color: '#2d7a3a', fontSize: 13, marginBottom: 8 }}>{message}</p>}
      <button type="submit" disabled={saving} style={primaryButton}>
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
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
      setError('Please choose a file.')
      return
    }
    setUploading(true)
    setError('')

    const { data: userData } = await supabase.auth.getUser()
    const path = `${customerId}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage.from('customer-documents').upload(path, file)
    if (uploadError) {
      setUploading(false)
      setError('Could not upload the file.')
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
      setError('Could not save the document record.')
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
      <h3 style={{ fontSize: 14, color: '#2d4a3a', marginBottom: 10 }}>My Documents</h3>
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
          {uploading ? 'Uploading...' : '+ Upload'}
        </button>
      </form>
      {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 8 }}>{error}</p>}

      {documents.length === 0 ? (
        <p style={{ color: '#999', fontSize: 13 }}>No documents uploaded yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {documents.map((doc) => (
            <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2d4a3a' }}>{DOCUMENT_TYPE_LABELS[doc.doc_type]}</div>
                <div style={{ fontSize: 12, color: '#777' }}>{doc.file_name}</div>
              </div>
              <button style={secondaryButton} onClick={() => viewDocument(doc.file_path)}>
                View
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
