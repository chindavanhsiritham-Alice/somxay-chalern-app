'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { money } from '@/lib/portal'

export interface SalesRep {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  user_id: string | null
  active: boolean
  created_at: string | null
}
export interface RepStat {
  sales_rep_id: string
  customer_count: number
  total_sales_usd: number
  outstanding_usd: number
}

const inputStyle: React.CSSProperties = { width: '100%', padding: 9, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', fontSize: 14 }

const EMPTY = { full_name: '', email: '', phone: '', user_id: '' }

export default function SalesRepsManager({ initial, stats }: { initial: SalesRep[]; stats: Record<string, RepStat> }) {
  const supabase = createClient()
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<SalesRep | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const totals = initial.reduce(
    (acc, r) => {
      const s = stats[r.id]
      return {
        customers: acc.customers + (s?.customer_count ?? 0),
        sales: acc.sales + (s?.total_sales_usd ?? 0),
        outstanding: acc.outstanding + (s?.outstanding_usd ?? 0),
      }
    },
    { customers: 0, sales: 0, outstanding: 0 }
  )

  function openAdd() {
    setError('')
    setForm(EMPTY)
    setEditing(null)
    setAdding(true)
  }
  function openEdit(r: SalesRep) {
    setError('')
    setForm({ full_name: r.full_name, email: r.email ?? '', phone: r.phone ?? '', user_id: r.user_id ?? '' })
    setEditing(r)
    setAdding(true)
  }

  async function save() {
    if (!form.full_name.trim()) {
      setError('Name is required.')
      return
    }
    setBusy(true)
    setError('')
    const payload = {
      full_name: form.full_name.trim(),
      email: form.email || null,
      phone: form.phone || null,
      user_id: form.user_id.trim() || null,
    }
    const { error: e } = editing
      ? await supabase.from('sales_reps').update(payload).eq('id', editing.id)
      : await supabase.from('sales_reps').insert(payload)
    setBusy(false)
    if (e) {
      setError(e.message)
      return
    }
    setAdding(false)
    router.refresh()
  }

  async function toggleActive(r: SalesRep) {
    const { error: e } = await supabase.from('sales_reps').update({ active: !r.active }).eq('id', r.id)
    if (e) {
      setError(e.message)
      return
    }
    router.refresh()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>Sales Representatives</h1>
          <p style={{ color: '#6b8f5e', marginBottom: 20 }}>Manage reps and review their performance.</p>
        </div>
        <button onClick={openAdd} style={{ background: '#2d7a3a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          + Add Rep
        </button>
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', marginBottom: 24 }}>
        <Stat label="Sales Reps" value={initial.length.toString()} />
        <Stat label="Total Customers" value={totals.customers.toLocaleString()} />
        <Stat label="Total Sales" value={money('$', totals.sales)} />
        <Stat label="Outstanding" value={money('$', totals.outstanding)} />
      </div>

      {error && <p style={{ background: '#f5d6d6', color: '#9a2a2a', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>{error}</p>}

      <div style={{ background: '#fff', borderRadius: 12, padding: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
        {initial.length === 0 ? (
          <p style={{ color: '#999', padding: 16 }}>No sales reps yet. Add your first rep.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 640 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#6b8f5e', borderBottom: '1px solid #eee' }}>
                <th style={{ padding: '10px 8px' }}>Name</th>
                <th style={{ padding: '10px 8px' }}>Contact</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Customers</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Sales</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Outstanding</th>
                <th style={{ padding: '10px 8px' }}>Status</th>
                <th style={{ padding: '10px 8px' }}></th>
              </tr>
            </thead>
            <tbody>
              {initial.map((r) => {
                const s = stats[r.id]
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f5f5f5', opacity: r.active ? 1 : 0.55 }}>
                    <td style={{ padding: '10px 8px', fontWeight: 600, color: '#2d4a3a' }}>
                      {r.full_name}
                      {!r.user_id && <span style={{ fontSize: 11, color: '#b08900', marginLeft: 6 }}>(no login)</span>}
                    </td>
                    <td style={{ padding: '10px 8px', color: '#6b8f5e' }}>
                      {r.email ?? ''}
                      {r.phone ? ` · ${r.phone}` : ''}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>{(s?.customer_count ?? 0).toLocaleString()}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>{money('$', s?.total_sales_usd ?? 0)}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>{money('$', s?.outstanding_usd ?? 0)}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <span style={{ background: r.active ? '#d4f0d4' : '#e2e2e2', color: r.active ? '#256029' : '#666', padding: '2px 10px', borderRadius: 999, fontSize: 12 }}>
                        {r.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                      <button onClick={() => openEdit(r)} style={btn('#2d7a3a')}>Edit</button>{' '}
                      <button onClick={() => toggleActive(r)} style={btn('#8a6d1a')}>{r.active ? 'Deactivate' : 'Activate'}</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {adding && (
        <div
          style={{ position: 'fixed', inset: 0, background: '#00000066', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, overflowY: 'auto', zIndex: 50 }}
          onClick={() => setAdding(false)}
        >
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 440, boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ color: '#2d7a3a', marginTop: 0 }}>{editing ? 'Edit Rep' : 'Add Rep'}</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <Field label="Full name">
                <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} style={inputStyle} />
              </Field>
              <Field label="Email">
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
              </Field>
              <Field label="Phone">
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
              </Field>
              <Field label="Login user ID (optional UUID — lets this rep see their dashboard)">
                <input value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} style={inputStyle} placeholder="auth user id" />
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setAdding(false)} style={{ background: '#eee', color: '#555', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={save} disabled={busy} style={{ background: '#2d7a3a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: busy ? 'default' : 'pointer' }}>
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function btn(color: string): React.CSSProperties {
  return { background: '#fff', color, border: `1px solid ${color}`, borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <p style={{ fontSize: 12, color: '#6b8f5e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 700, color: '#2d4a3a', margin: 0 }}>{value}</p>
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
