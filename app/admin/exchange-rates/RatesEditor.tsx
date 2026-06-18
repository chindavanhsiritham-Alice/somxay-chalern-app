'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RATE_LABELS, type RateRecord, type RatePair } from '@/lib/exchangeRates'

function formatRate(n: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(n)
}

function formatDate(d: string | null) {
  if (!d) return 'Never'
  const parsed = new Date(d)
  if (Number.isNaN(parsed.getTime())) return d
  return parsed.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

interface RowState {
  pair: RatePair
  rate: number
  draft: string
  updated_at: string | null
  saving: boolean
  error: string | null
}

export default function RatesEditor({ initial }: { initial: RateRecord[] }) {
  const supabase = createClient()
  const [rows, setRows] = useState<RowState[]>(
    initial.map((r) => ({
      pair: r.pair,
      rate: r.rate,
      draft: String(r.rate),
      updated_at: r.updated_at,
      saving: false,
      error: null,
    }))
  )

  function setRow(pair: RatePair, patch: Partial<RowState>) {
    setRows((list) => list.map((r) => (r.pair === pair ? { ...r, ...patch } : r)))
  }

  async function save(row: RowState) {
    const value = Number(row.draft)
    if (!Number.isFinite(value) || value <= 0) {
      setRow(row.pair, { error: 'Enter a valid rate greater than 0.' })
      return
    }

    setRow(row.pair, { saving: true, error: null })
    const updated_at = new Date().toISOString()
    const { error } = await supabase
      .from('exchange_rates')
      .upsert({ pair: row.pair, rate: value, updated_at }, { onConflict: 'pair' })

    if (error) {
      setRow(row.pair, { saving: false, error: error.message })
      return
    }
    setRow(row.pair, { saving: false, rate: value, updated_at })
  }

  return (
    <div>
      <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>Exchange Rates</h1>
      <p style={{ color: '#6b8f5e', marginBottom: 24 }}>
        Manually maintained USD conversion rates, used as reference pricing across the app.
      </p>

      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', maxWidth: 640 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#6b8f5e', borderBottom: '1px solid #eee' }}>
              <th style={{ padding: '8px 0' }}>Pair</th>
              <th>Rate (per 1 USD)</th>
              <th>Last Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const changed = row.draft.trim() !== String(row.rate)
              return (
                <tr key={row.pair} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '12px 0', fontWeight: 600, color: '#2d4a3a' }}>
                    {RATE_LABELS[row.pair]}
                    <div style={{ fontSize: 11, color: '#9aa', fontWeight: 400 }}>{row.pair}</div>
                  </td>
                  <td>
                    <input
                      type="number"
                      step="any"
                      value={row.draft}
                      onChange={(e) => setRow(row.pair, { draft: e.target.value, error: null })}
                      style={{ width: 120, padding: '6px 8px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14 }}
                    />
                    <div style={{ fontSize: 11, color: '#9aa', marginTop: 2 }}>current: {formatRate(row.rate)}</div>
                  </td>
                  <td style={{ color: '#6b8f5e', fontSize: 13 }}>{formatDate(row.updated_at)}</td>
                  <td>
                    <button
                      onClick={() => save(row)}
                      disabled={row.saving || !changed}
                      style={{
                        background: changed ? '#2d7a3a' : '#cfe0cf',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '6px 14px',
                        fontSize: 13,
                        cursor: row.saving || !changed ? 'default' : 'pointer',
                      }}
                    >
                      {row.saving ? 'Saving…' : 'Save'}
                    </button>
                    {row.error && <div style={{ color: '#9a2a2a', fontSize: 12, marginTop: 4 }}>{row.error}</div>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
