'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Product {
  id: string | number
  name: string
  grade?: string | null
  variety?: string | null
  process?: string | null
  crop_year?: string | null
  moisture?: string | null
  defect?: string | null
  packing?: string | null
  stock_kg?: number | null
  public_price_usd?: number | null
  public_price_thb?: number | null
  public_price_lak?: number | null
  available?: boolean | null
}

type FieldType = 'text' | 'number'

const FIELDS: { key: keyof Product; label: string; type: FieldType }[] = [
  { key: 'name', label: 'Product', type: 'text' },
  { key: 'grade', label: 'Grade', type: 'text' },
  { key: 'variety', label: 'Variety', type: 'text' },
  { key: 'process', label: 'Process', type: 'text' },
  { key: 'crop_year', label: 'Crop Year', type: 'text' },
  { key: 'moisture', label: 'Moisture', type: 'text' },
  { key: 'defect', label: 'Defect', type: 'text' },
  { key: 'packing', label: 'Packing', type: 'text' },
  { key: 'stock_kg', label: 'Stock KG', type: 'number' },
  { key: 'public_price_usd', label: 'USD/kg', type: 'number' },
  { key: 'public_price_thb', label: 'THB/kg', type: 'number' },
  { key: 'public_price_lak', label: 'LAK/kg', type: 'number' },
]

const PRICE_PREFIX: Partial<Record<keyof Product, string>> = {
  public_price_usd: '$',
  public_price_thb: '฿',
  public_price_lak: '₭',
}

function displayValue(p: Product, key: keyof Product): string {
  const v = p[key]
  if (v == null || v === '') return '-'
  if (key in PRICE_PREFIX) {
    const prefix = PRICE_PREFIX[key]
    return `${prefix}${Number(v).toLocaleString()}`
  }
  return String(v)
}

const cell: React.CSSProperties = { padding: '10px 12px', whiteSpace: 'nowrap' }
const headCell: React.CSSProperties = { ...cell, fontWeight: 600 }

export default function ProductsManager({ initialProducts }: { initialProducts: Product[] }) {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [editingId, setEditingId] = useState<Product['id'] | null>(null)
  const [draft, setDraft] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const availableCount = products.filter((p) => p.available !== false).length

  const stats = [
    { label: 'Total Products', value: products.length.toString() },
    { label: 'Available', value: availableCount.toString() },
  ]

  function startEdit(p: Product) {
    setError(null)
    setEditingId(p.id)
    setDraft({ ...p })
  }

  function cancelEdit() {
    setEditingId(null)
    setDraft(null)
    setError(null)
  }

  function updateDraft(key: keyof Product, raw: string, type: FieldType) {
    setDraft((d) => {
      if (!d) return d
      const value = type === 'number' ? (raw === '' ? null : Number(raw)) : raw === '' ? null : raw
      return { ...d, [key]: value }
    })
  }

  async function save() {
    if (!draft) return
    setSaving(true)
    setError(null)

    const update: Partial<Product> = {}
    for (const { key } of FIELDS) {
      // @ts-expect-error indexed assignment across a heterogeneous record
      update[key] = draft[key] ?? null
    }
    update.available = draft.available !== false

    const { error: updateError } = await supabase
      .from('products_catalog')
      .update(update)
      .eq('id', draft.id)

    setSaving(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setProducts((list) => list.map((p) => (p.id === draft.id ? { ...p, ...update } : p)))
    cancelEdit()
  }

  return (
    <div>
      <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>Product &amp; Inventory</h1>
      <p style={{ color: '#6b8f5e', marginBottom: 24 }}>Green coffee catalog and multi-currency pricing</p>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 32 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: 12, color: '#6b8f5e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#2d4a3a', margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <h2 style={{ color: '#2d7a3a', fontSize: 18, marginBottom: 16 }}>Catalog</h2>

        {error && (
          <p style={{ background: '#f5d6d6', color: '#9a2a2a', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
            {error}
          </p>
        )}

        {products.length === 0 ? (
          <p style={{ color: '#999' }}>No products yet. Add products to the catalog to see them here.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#6b8f5e', borderBottom: '1px solid #eee' }}>
                  {FIELDS.map((f) => (
                    <th key={f.key} style={headCell}>{f.label}</th>
                  ))}
                  <th style={headCell}>Status</th>
                  <th style={headCell}></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const isEditing = editingId === p.id
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      {FIELDS.map((f) => (
                        <td key={f.key} style={cell}>
                          {isEditing && draft ? (
                            <input
                              type={f.type === 'number' ? 'number' : 'text'}
                              value={draft[f.key] == null ? '' : String(draft[f.key])}
                              onChange={(e) => updateDraft(f.key, e.target.value, f.type)}
                              style={{
                                width: f.type === 'number' ? 90 : 130,
                                padding: '4px 6px',
                                border: '1px solid #ccc',
                                borderRadius: 6,
                                fontSize: 13,
                              }}
                            />
                          ) : (
                            <span style={f.key in PRICE_PREFIX ? { color: '#2d7a3a', fontWeight: 600 } : f.key === 'name' ? { color: '#2d4a3a', fontWeight: 600 } : { color: '#555' }}>
                              {displayValue(p, f.key)}
                            </span>
                          )}
                        </td>
                      ))}
                      <td style={cell}>
                        {isEditing && draft ? (
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                            <input
                              type="checkbox"
                              checked={draft.available !== false}
                              onChange={(e) => setDraft((d) => (d ? { ...d, available: e.target.checked } : d))}
                            />
                            Available
                          </label>
                        ) : (
                          <span
                            style={{
                              background: p.available !== false ? '#d4f0d4' : '#f5d6d6',
                              padding: '2px 10px',
                              borderRadius: 999,
                              fontSize: 12,
                            }}
                          >
                            {p.available !== false ? 'Available' : 'Unavailable'}
                          </span>
                        )}
                      </td>
                      <td style={cell}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={save}
                              disabled={saving}
                              style={{ background: '#2d7a3a', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 13, cursor: 'pointer' }}
                            >
                              {saving ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={saving}
                              style={{ background: '#eee', color: '#555', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 13, cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(p)}
                            disabled={editingId !== null}
                            style={{ background: '#fff', color: '#2d7a3a', border: '1px solid #2d7a3a', borderRadius: 6, padding: '5px 12px', fontSize: 13, cursor: editingId !== null ? 'default' : 'pointer', opacity: editingId !== null ? 0.4 : 1 }}
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
