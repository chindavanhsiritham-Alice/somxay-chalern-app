'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  CUSTOMER_STATUSES,
  CUSTOMER_TIERS,
  CUSTOMER_TYPES,
  PAYMENT_TERM_DAYS,
  STATUS_BADGE_COLORS,
} from '@/lib/portal'

export interface AdminCustomer {
  id: string
  full_name: string | null
  company_name: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  country: string | null
  province_city: string | null
  customer_type: string | null
  expected_monthly_volume: string | null
  website: string | null
  facebook: string | null
  instagram: string | null
  status: string | null
  tier: string | null
  credit_enabled: boolean | null
  payment_term_days: number | null
  created_at: string | null
}

const STATUS_FILTERS = ['all', ...CUSTOMER_STATUSES] as const

export default function CustomerApprovals({ initial }: { initial: AdminCustomer[] }) {
  const supabase = createClient()
  const [customers, setCustomers] = useState<AdminCustomer[]>(initial)
  const [filter, setFilter] = useState<string>('pending')
  const [editing, setEditing] = useState<AdminCustomer | null>(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const filtered = useMemo(
    () => (filter === 'all' ? customers : customers.filter((c) => (c.status ?? 'pending') === filter)),
    [customers, filter]
  )

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const cust of customers) c[cust.status ?? 'pending'] = (c[cust.status ?? 'pending'] ?? 0) + 1
    return c
  }, [customers])

  async function patch(id: string, changes: Partial<AdminCustomer>) {
    setBusyId(id)
    setError('')
    const { error: updErr } = await supabase.from('customers').update(changes).eq('id', id)
    setBusyId(null)
    if (updErr) {
      setError(updErr.message)
      return false
    }
    setCustomers((list) => list.map((c) => (c.id === id ? { ...c, ...changes } : c)))
    return true
  }

  async function saveEdit() {
    if (!editing) return
    const { id, ...rest } = editing
    const ok = await patch(id, rest)
    if (ok) setEditing(null)
  }

  return (
    <div>
      <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>Customer Approvals</h1>
      <p style={{ color: '#6b8f5e', marginBottom: 20 }}>Review registrations and manage customer access.</p>

      {error && (
        <p style={{ background: '#f5d6d6', color: '#9a2a2a', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid ' + (filter === s ? '#2d7a3a' : '#ddd'),
              background: filter === s ? '#2d7a3a' : '#fff',
              color: filter === s ? '#fff' : '#555',
              fontSize: 13,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {s}
            {s !== 'all' && counts[s] ? ` (${counts[s]})` : ''}
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {filtered.length === 0 ? (
          <p style={{ color: '#999' }}>No customers in this view.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {filtered.map((c) => {
              const sc = STATUS_BADGE_COLORS[c.status ?? 'pending'] ?? STATUS_BADGE_COLORS.pending
              const busy = busyId === c.id
              return (
                <div key={c.id} style={{ border: '1px solid #eee', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#2d4a3a' }}>
                        {c.full_name || c.company_name || '—'}{' '}
                        <span style={{ fontWeight: 400, color: '#9aa', fontSize: 13 }}>{c.customer_type}</span>
                      </div>
                      <div style={{ fontSize: 13, color: '#6b8f5e' }}>
                        {c.email} · {c.phone} · {c.province_city}, {c.country}
                      </div>
                      <div style={{ fontSize: 12, color: '#9aa', marginTop: 2 }}>
                        {c.company_name ? `${c.company_name} · ` : ''}
                        {c.expected_monthly_volume ? `~${c.expected_monthly_volume}/mo · ` : ''}
                        Tier: {c.tier} · {c.credit_enabled ? `Credit ${c.payment_term_days}d` : 'Prepaid'}
                      </div>
                    </div>
                    <span style={{ background: sc.bg, color: sc.fg, padding: '3px 12px', borderRadius: 999, fontSize: 12, height: 'fit-content' }}>
                      {c.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                    {c.status !== 'approved' && (
                      <Action label="Approve" color="#256029" disabled={busy} onClick={() => patch(c.id, { status: 'approved' })} />
                    )}
                    {c.status !== 'rejected' && (
                      <Action label="Reject" color="#9a2a2a" disabled={busy} onClick={() => patch(c.id, { status: 'rejected' })} />
                    )}
                    {c.status !== 'suspended' && (
                      <Action label="Suspend" color="#8a6d1a" disabled={busy} onClick={() => patch(c.id, { status: 'suspended' })} />
                    )}
                    <Action label="Edit" color="#2d7a3a" disabled={busy} onClick={() => setEditing(c)} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {editing && (
        <EditModal
          customer={editing}
          onChange={setEditing}
          onSave={saveEdit}
          onClose={() => setEditing(null)}
          busy={busyId === editing.id}
        />
      )}
    </div>
  )
}

function Action({ label, color, onClick, disabled }: { label: string; color: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ background: '#fff', color, border: `1px solid ${color}`, borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 }}
    >
      {label}
    </button>
  )
}

const modalInput: React.CSSProperties = { width: '100%', padding: 9, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', fontSize: 14 }

function EditModal({
  customer,
  onChange,
  onSave,
  onClose,
  busy,
}: {
  customer: AdminCustomer
  onChange: (c: AdminCustomer) => void
  onSave: () => void
  onClose: () => void
  busy: boolean
}) {
  function set<K extends keyof AdminCustomer>(key: K, value: AdminCustomer[K]) {
    onChange({ ...customer, [key]: value })
  }
  const textFields: { key: keyof AdminCustomer; label: string }[] = [
    { key: 'full_name', label: 'Full name' },
    { key: 'company_name', label: 'Company name' },
    { key: 'phone', label: 'Phone' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'country', label: 'Country' },
    { key: 'province_city', label: 'Province / City' },
    { key: 'expected_monthly_volume', label: 'Expected monthly volume' },
    { key: 'website', label: 'Website' },
    { key: 'facebook', label: 'Facebook' },
    { key: 'instagram', label: 'Instagram' },
  ]

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: '#00000066', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, overflowY: 'auto', zIndex: 50 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 620, boxSizing: 'border-box' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ color: '#2d7a3a', marginTop: 0 }}>Edit Customer</h2>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <Field label="Status">
            <select value={customer.status ?? 'pending'} onChange={(e) => set('status', e.target.value)} style={modalInput}>
              {CUSTOMER_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Tier">
            <select value={customer.tier ?? 'retail'} onChange={(e) => set('tier', e.target.value)} style={modalInput}>
              {CUSTOMER_TIERS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Customer type">
            <select value={customer.customer_type ?? ''} onChange={(e) => set('customer_type', e.target.value)} style={modalInput}>
              <option value="">Select…</option>
              {CUSTOMER_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Credit enabled">
            <select
              value={customer.credit_enabled ? 'yes' : 'no'}
              onChange={(e) => set('credit_enabled', e.target.value === 'yes')}
              style={modalInput}
            >
              <option value="no">No (prepaid)</option>
              <option value="yes">Yes</option>
            </select>
          </Field>
          <Field label="Payment term (days)">
            <select
              value={String(customer.payment_term_days ?? 0)}
              onChange={(e) => set('payment_term_days', Number(e.target.value))}
              style={modalInput}
            >
              {PAYMENT_TERM_DAYS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>
          {textFields.map((f) => (
            <Field key={f.key} label={f.label}>
              <input value={(customer[f.key] as string) ?? ''} onChange={(e) => set(f.key, e.target.value)} style={modalInput} />
            </Field>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ background: '#eee', color: '#555', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={busy}
            style={{ background: '#2d7a3a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: busy ? 'default' : 'pointer' }}
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontSize: 12, color: '#6b8f5e' }}>
      {label}
      <div style={{ marginTop: 4 }}>{children}</div>
    </label>
  )
}
