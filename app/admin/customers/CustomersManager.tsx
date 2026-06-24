'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  CUSTOMER_STATUSES,
  CUSTOMER_TIERS,
  TIER_LABELS,
  PAYMENT_TERMS,
  PAYMENT_TERM_LABELS,
  PAYMENT_TERM_TO_DAYS,
  STATUS_BADGE_COLORS,
  money,
} from '@/lib/portal'

export interface ManagedCustomer {
  id: string
  customer_code: string | null
  full_name: string | null
  company_name: string | null
  email: string | null
  phone: string | null
  country: string | null
  province_city: string | null
  customer_type: string | null
  status: string | null
  tier: string | null
  payment_terms: string | null
  credit_limit_usd: number | null
  sales_rep_id: string | null
}
export interface Balance {
  customer_id: string
  credit_limit_usd: number | null
  outstanding_usd: number | null
  available_usd: number | null
}
export interface RepOption {
  id: string
  full_name: string
}
interface Filters {
  q: string
  status: string
  tier: string
  rep: string
}

const selectStyle: React.CSSProperties = { padding: '8px', border: '1px solid #ccc', borderRadius: 8, fontSize: 13, background: '#fff' }
const modalInput: React.CSSProperties = { width: '100%', padding: 9, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', fontSize: 14 }

export default function CustomersManager({
  customers,
  total,
  page,
  pageSize,
  filters,
  reps,
  balances,
}: {
  customers: ManagedCustomer[]
  total: number
  page: number
  pageSize: number
  filters: Filters
  reps: RepOption[]
  balances: Record<string, Balance>
}) {
  const router = useRouter()
  const supabase = createClient()
  const [search, setSearch] = useState(filters.q)
  const [editing, setEditing] = useState<ManagedCustomer | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const repName = (id: string | null) => reps.find((r) => r.id === id)?.full_name ?? '—'
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  function applyFilters(next: Partial<Filters> & { page?: number }) {
    const merged = { ...filters, ...next }
    const params = new URLSearchParams()
    if (merged.q) params.set('q', merged.q)
    if (merged.status) params.set('status', merged.status)
    if (merged.tier) params.set('tier', merged.tier)
    if (merged.rep) params.set('rep', merged.rep)
    const p = next.page ?? 1
    if (p > 1) params.set('page', String(p))
    router.push(`/admin/customers?${params.toString()}`)
  }

  async function saveEdit() {
    if (!editing) return
    setBusy(true)
    setError('')
    const terms = editing.payment_terms ?? 'prepaid'
    const { error: updErr } = await supabase
      .from('customers')
      .update({
        status: editing.status,
        tier: editing.tier,
        sales_rep_id: editing.sales_rep_id,
        credit_limit_usd: editing.credit_limit_usd ?? 0,
        payment_terms: terms,
        payment_term_days: PAYMENT_TERM_TO_DAYS[terms] ?? 0,
        credit_enabled: terms !== 'prepaid',
      })
      .eq('id', editing.id)
    setBusy(false)
    if (updErr) {
      setError(updErr.message)
      return
    }
    setEditing(null)
    router.refresh()
  }

  return (
    <div>
      <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>Customer Management</h1>
      <p style={{ color: '#6b8f5e', marginBottom: 16 }}>{total.toLocaleString()} customers</p>

      {error && <p style={{ background: '#f5d6d6', color: '#9a2a2a', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>{error}</p>}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            applyFilters({ q: search })
          }}
          style={{ display: 'flex', gap: 8, flex: 1, minWidth: 200 }}
        >
          <input
            placeholder="Search name, company, email, code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...selectStyle, flex: 1 }}
          />
          <button type="submit" style={{ background: '#2d7a3a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
            Search
          </button>
        </form>
        <select value={filters.status} onChange={(e) => applyFilters({ status: e.target.value })} style={selectStyle}>
          <option value="">All status</option>
          {CUSTOMER_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={filters.tier} onChange={(e) => applyFilters({ tier: e.target.value })} style={selectStyle}>
          <option value="">All tiers</option>
          {CUSTOMER_TIERS.map((t) => (
            <option key={t} value={t}>{TIER_LABELS[t]}</option>
          ))}
        </select>
        <select value={filters.rep} onChange={(e) => applyFilters({ rep: e.target.value })} style={selectStyle}>
          <option value="">All sales reps</option>
          {reps.map((r) => (
            <option key={r.id} value={r.id}>{r.full_name}</option>
          ))}
        </select>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
        {customers.length === 0 ? (
          <p style={{ color: '#999', padding: 16 }}>No customers match your filters.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 760 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#6b8f5e', borderBottom: '1px solid #eee' }}>
                <th style={{ padding: '10px 8px' }}>Code</th>
                <th style={{ padding: '10px 8px' }}>Customer</th>
                <th style={{ padding: '10px 8px' }}>Status</th>
                <th style={{ padding: '10px 8px' }}>Tier</th>
                <th style={{ padding: '10px 8px' }}>Sales Rep</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Outstanding</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Credit Limit</th>
                <th style={{ padding: '10px 8px' }}></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const sc = STATUS_BADGE_COLORS[c.status ?? 'pending'] ?? STATUS_BADGE_COLORS.pending
                const bal = balances[c.id]
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 600, color: '#6b8f5e', whiteSpace: 'nowrap' }}>{c.customer_code ?? '—'}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ fontWeight: 600, color: '#2d4a3a' }}>{c.full_name || c.company_name || '—'}</div>
                      <div style={{ fontSize: 12, color: '#9aa' }}>{c.email}</div>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <span style={{ background: sc.bg, color: sc.fg, padding: '2px 10px', borderRadius: 999, fontSize: 12 }}>{c.status}</span>
                    </td>
                    <td style={{ padding: '10px 8px' }}>{TIER_LABELS[c.tier ?? 'retail'] ?? c.tier}</td>
                    <td style={{ padding: '10px 8px' }}>{repName(c.sales_rep_id)}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>{money('$', bal?.outstanding_usd ?? 0)}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>{(c.credit_limit_usd ?? 0) > 0 ? money('$', c.credit_limit_usd) : '—'}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <button
                        onClick={() => setEditing(c)}
                        style={{ background: '#fff', color: '#2d7a3a', border: '1px solid #2d7a3a', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 13, color: '#6b8f5e' }}>
          Page {page} of {totalPages}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <PageButton disabled={page <= 1} onClick={() => applyFilters({ page: page - 1 })}>
            ← Prev
          </PageButton>
          <PageButton disabled={page >= totalPages} onClick={() => applyFilters({ page: page + 1 })}>
            Next →
          </PageButton>
        </div>
      </div>

      {editing && (
        <div
          style={{ position: 'fixed', inset: 0, background: '#00000066', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, overflowY: 'auto', zIndex: 50 }}
          onClick={() => setEditing(null)}
        >
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 480, boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ color: '#2d7a3a', marginTop: 0 }}>{editing.full_name || editing.company_name || 'Customer'}</h2>
            <p style={{ color: '#9aa', fontSize: 13, marginTop: 0 }}>{editing.customer_code ?? 'No code yet (assigned on approval)'}</p>

            <div style={{ display: 'grid', gap: 12 }}>
              <Field label="Status">
                <select value={editing.status ?? 'pending'} onChange={(e) => setEditing({ ...editing, status: e.target.value })} style={modalInput}>
                  {CUSTOMER_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Tier">
                <select value={editing.tier ?? 'retail'} onChange={(e) => setEditing({ ...editing, tier: e.target.value })} style={modalInput}>
                  {CUSTOMER_TIERS.map((t) => (
                    <option key={t} value={t}>{TIER_LABELS[t]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Sales rep">
                <select value={editing.sales_rep_id ?? ''} onChange={(e) => setEditing({ ...editing, sales_rep_id: e.target.value || null })} style={modalInput}>
                  <option value="">Unassigned</option>
                  {reps.map((r) => (
                    <option key={r.id} value={r.id}>{r.full_name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Payment terms">
                <select value={editing.payment_terms ?? 'prepaid'} onChange={(e) => setEditing({ ...editing, payment_terms: e.target.value })} style={modalInput}>
                  {PAYMENT_TERMS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Credit limit (USD) — 0 means no credit limit enforced">
                <input
                  type="number"
                  min={0}
                  value={editing.credit_limit_usd ?? 0}
                  onChange={(e) => setEditing({ ...editing, credit_limit_usd: e.target.value === '' ? 0 : Number(e.target.value) })}
                  style={modalInput}
                />
              </Field>
              {balances[editing.id] && (
                <p style={{ fontSize: 13, color: '#6b8f5e', margin: 0 }}>
                  Outstanding {money('$', balances[editing.id].outstanding_usd ?? 0)} ·{' '}
                  Terms: {PAYMENT_TERM_LABELS[editing.payment_terms ?? 'prepaid']}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setEditing(null)} style={{ background: '#eee', color: '#555', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={saveEdit} disabled={busy} style={{ background: '#2d7a3a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: busy ? 'default' : 'pointer' }}>
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PageButton({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: '#fff',
        color: disabled ? '#bbb' : '#2d7a3a',
        border: '1px solid ' + (disabled ? '#eee' : '#2d7a3a'),
        borderRadius: 8,
        padding: '7px 14px',
        fontSize: 13,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {children}
    </button>
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
