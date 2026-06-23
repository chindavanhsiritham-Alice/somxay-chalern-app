'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CUSTOMER_TYPES, STATUS_BADGE_COLORS } from '@/lib/portal'

export interface CustomerProfile {
  id?: string
  full_name: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  country: string | null
  province_city: string | null
  customer_type: string | null
  company_name: string | null
  website: string | null
  facebook: string | null
  instagram: string | null
  expected_monthly_volume: string | null
  status: string | null
  tier: string | null
}

const FIELDS: { key: keyof CustomerProfile; label: string; required?: boolean; type?: string }[] = [
  { key: 'full_name', label: 'Full name', required: true },
  { key: 'phone', label: 'Phone', required: true, type: 'tel' },
  { key: 'whatsapp', label: 'WhatsApp', required: true, type: 'tel' },
  { key: 'country', label: 'Country', required: true },
  { key: 'province_city', label: 'Province / City', required: true },
  { key: 'company_name', label: 'Company name' },
  { key: 'website', label: 'Website' },
  { key: 'expected_monthly_volume', label: 'Expected monthly volume' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
]

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 10,
  borderRadius: 8,
  border: '1px solid #ddd',
  boxSizing: 'border-box',
  fontSize: 14,
}

export default function ProfileForm({ initial, email }: { initial: CustomerProfile | null; email: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [form, setForm] = useState<CustomerProfile>(
    initial ?? {
      full_name: '',
      phone: '',
      whatsapp: '',
      email,
      country: '',
      province_city: '',
      customer_type: '',
      company_name: '',
      website: '',
      facebook: '',
      instagram: '',
      expected_monthly_volume: '',
      status: 'pending',
      tier: 'retail',
    }
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function set(key: keyof CustomerProfile, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      setError('Your session expired. Please sign in again.')
      return
    }

    // Only customer-editable fields — status/tier/credit stay admin-controlled.
    const payload = {
      user_id: user.id,
      email: form.email,
      full_name: form.full_name,
      phone: form.phone,
      whatsapp: form.whatsapp,
      country: form.country,
      province_city: form.province_city,
      customer_type: form.customer_type,
      company_name: form.company_name || null,
      website: form.website || null,
      facebook: form.facebook || null,
      instagram: form.instagram || null,
      expected_monthly_volume: form.expected_monthly_volume || null,
    }

    const { error: saveError } = initial?.id
      ? await supabase.from('customers').update(payload).eq('id', initial.id)
      : await supabase.from('customers').insert({ ...payload, status: 'pending', tier: 'retail' })

    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setMessage('Profile saved.')
    router.refresh()
  }

  const statusColor = STATUS_BADGE_COLORS[form.status ?? 'pending'] ?? STATUS_BADGE_COLORS.pending

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ color: '#2d4a3a', marginBottom: 4 }}>My Profile</h1>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{ background: statusColor.bg, color: statusColor.fg, padding: '3px 12px', borderRadius: 999, fontSize: 12 }}>
          Status: {form.status ?? 'pending'}
        </span>
        <span style={{ background: '#eef5ea', color: '#6b8f5e', padding: '3px 12px', borderRadius: 999, fontSize: 12 }}>
          Tier: {form.tier ?? 'retail'}
        </span>
      </div>

      <form onSubmit={save} style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <label style={{ display: 'block', fontSize: 13, color: '#555', marginBottom: 4 }}>Email</label>
        <input value={form.email ?? ''} disabled style={{ ...inputStyle, background: '#f5f5f5', color: '#888' }} />

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginTop: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#555', marginBottom: 4 }}>
              Customer type{' '}<span style={{ color: '#c0392b' }}>*</span>
            </label>
            <select value={form.customer_type ?? ''} onChange={(e) => set('customer_type', e.target.value)} required style={inputStyle}>
              <option value="">Select…</option>
              {CUSTOMER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label style={{ display: 'block', fontSize: 13, color: '#555', marginBottom: 4 }}>
                {f.label}
                {f.required && <span style={{ color: '#c0392b' }}> *</span>}
              </label>
              <input
                type={f.type ?? 'text'}
                value={(form[f.key] as string) ?? ''}
                onChange={(e) => set(f.key, e.target.value)}
                required={f.required}
                style={inputStyle}
              />
            </div>
          ))}
        </div>

        {error && <p style={{ color: '#c0392b', fontSize: 13 }}>{error}</p>}
        {message && <p style={{ color: '#256029', fontSize: 13 }}>{message}</p>}

        <button
          type="submit"
          disabled={saving}
          style={{
            marginTop: 16,
            background: saving ? '#9bbf8c' : '#2d4a3a',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '11px 20px',
            fontSize: 14,
            fontWeight: 600,
            cursor: saving ? 'default' : 'pointer',
          }}
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </div>
  )
}
