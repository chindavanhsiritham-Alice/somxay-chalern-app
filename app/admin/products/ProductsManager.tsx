'use client'

import { useMemo, useState } from 'react'
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
  // Admin-only internal fields — never exposed in the customer portal.
  internal_cost_usd?: number | null
  internal_cost_thb?: number | null
  internal_cost_lak?: number | null
  margin_usd?: number | null
  margin_percent?: number | null
  available?: boolean | null
  archived?: boolean | null
}

type FieldType = 'text' | 'number'
interface FieldDef {
  key: keyof Product
  label: string
  type: FieldType
}

const CATALOG_FIELDS: FieldDef[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'grade', label: 'Grade', type: 'text' },
  { key: 'variety', label: 'Variety', type: 'text' },
  { key: 'process', label: 'Process', type: 'text' },
  { key: 'crop_year', label: 'Crop Year', type: 'text' },
  { key: 'moisture', label: 'Moisture', type: 'text' },
  { key: 'defect', label: 'Defect', type: 'text' },
  { key: 'packing', label: 'Packing', type: 'text' },
]

const PUBLIC_PRICE_FIELDS: FieldDef[] = [
  { key: 'public_price_usd', label: 'USD/kg', type: 'number' },
  { key: 'public_price_thb', label: 'THB/kg', type: 'number' },
  { key: 'public_price_lak', label: 'LAK/kg', type: 'number' },
]

const INTERNAL_FIELDS: FieldDef[] = [
  { key: 'internal_cost_usd', label: 'Internal Cost USD', type: 'number' },
  { key: 'internal_cost_thb', label: 'Internal Cost THB', type: 'number' },
  { key: 'internal_cost_lak', label: 'Internal Cost LAK', type: 'number' },
  { key: 'margin_usd', label: 'Margin USD', type: 'number' },
  { key: 'margin_percent', label: 'Margin %', type: 'number' },
]

const ALL_EDIT_FIELDS = [...CATALOG_FIELDS, ...PUBLIC_PRICE_FIELDS, ...INTERNAL_FIELDS]

function num(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function money(prefix: string, value: number | null | undefined): string {
  if (value == null) return '-'
  return `${prefix}${Number(value).toLocaleString()}`
}

function productStatus(p: Product): 'Archived' | 'Available' | 'Unavailable' {
  if (p.archived) return 'Archived'
  return p.available !== false ? 'Available' : 'Unavailable'
}

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  Available: { background: '#d4f0d4', color: '#256029' },
  Unavailable: { background: '#f5d6d6', color: '#9a2a2a' },
  Archived: { background: '#e2e2e2', color: '#666' },
}

const cell: React.CSSProperties = { padding: '10px 12px', whiteSpace: 'nowrap', verticalAlign: 'top' }
const headCell: React.CSSProperties = { ...cell, fontWeight: 600 }
const inputStyle: React.CSSProperties = { padding: '6px 8px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13, width: '100%' }
const filterSelect: React.CSSProperties = { padding: '7px 8px', border: '1px solid #ccc', borderRadius: 8, fontSize: 13, background: '#fff' }

function distinct(products: Product[], key: keyof Product): string[] {
  const set = new Set<string>()
  for (const p of products) {
    const v = p[key]
    if (v != null && v !== '') set.add(String(v))
  }
  return Array.from(set).sort()
}

type EditorMode = 'add' | 'edit' | null

export default function ProductsManager({
  initialProducts,
  usdThb,
  usdLak,
}: {
  initialProducts: Product[]
  usdThb: number
  usdLak: number
}) {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>(initialProducts)

  // Filters
  const [search, setSearch] = useState('')
  const [fName, setFName] = useState('')
  const [fGrade, setFGrade] = useState('')
  const [fVariety, setFVariety] = useState('')
  const [fCropYear, setFCropYear] = useState('')
  const [fAvailability, setFAvailability] = useState('')

  // Editor (add / edit)
  const [mode, setMode] = useState<EditorMode>(null)
  const [draft, setDraft] = useState<Partial<Product>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Inline stock editing
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({})
  const [stockSaving, setStockSaving] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      if (fName && p.name !== fName) return false
      if (fGrade && (p.grade ?? '') !== fGrade) return false
      if (fVariety && (p.variety ?? '') !== fVariety) return false
      if (fCropYear && (p.crop_year ?? '') !== fCropYear) return false
      if (fAvailability) {
        const status = productStatus(p)
        if (fAvailability === 'available' && status !== 'Available') return false
        if (fAvailability === 'unavailable' && status !== 'Unavailable') return false
        if (fAvailability === 'archived' && status !== 'Archived') return false
      }
      if (q) {
        const haystack = [p.name, p.grade, p.variety, p.process, p.crop_year]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [products, search, fName, fGrade, fVariety, fCropYear, fAvailability])

  const stats = [
    { label: 'Total Products', value: products.length.toString() },
    { label: 'Available', value: products.filter((p) => productStatus(p) === 'Available').length.toString() },
    { label: 'Total Stock', value: `${products.reduce((s, p) => s + (Number(p.stock_kg) || 0), 0).toLocaleString()} kg` },
  ]

  function openAdd() {
    setError(null)
    setMode('add')
    setDraft({ available: true })
  }

  function openEdit(p: Product) {
    setError(null)
    setMode('edit')
    setDraft({ ...p })
  }

  function closeEditor() {
    setMode(null)
    setDraft({})
    setError(null)
  }

  function buildPayload(): Partial<Product> {
    const payload: Partial<Product> = {}
    for (const f of ALL_EDIT_FIELDS) {
      const raw = draft[f.key]
      if (f.type === 'number') {
        ;(payload as Record<string, unknown>)[f.key] = num(raw)
      } else {
        ;(payload as Record<string, unknown>)[f.key] = raw == null || raw === '' ? null : String(raw)
      }
    }
    payload.available = draft.available !== false
    payload.archived = draft.archived === true
    return payload
  }

  async function saveEditor() {
    if (!draft.name || String(draft.name).trim() === '') {
      setError('Name is required.')
      return
    }
    setSaving(true)
    setError(null)
    const payload = buildPayload()

    if (mode === 'add') {
      const { data, error: insertError } = await supabase
        .from('products_catalog')
        .insert(payload)
        .select()
        .single()
      setSaving(false)
      if (insertError) {
        setError(insertError.message)
        return
      }
      setProducts((list) => [...list, data as Product])
    } else {
      const { error: updateError } = await supabase
        .from('products_catalog')
        .update(payload)
        .eq('id', draft.id!)
      setSaving(false)
      if (updateError) {
        setError(updateError.message)
        return
      }
      setProducts((list) => list.map((p) => (p.id === draft.id ? { ...p, ...payload } : p)))
    }
    closeEditor()
  }

  async function removeProduct(p: Product) {
    if (!window.confirm(`Delete "${p.name} ${p.grade ?? ''} ${p.crop_year ?? ''}"? This cannot be undone.`)) return
    const { error: deleteError } = await supabase.from('products_catalog').delete().eq('id', p.id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    setProducts((list) => list.filter((x) => x.id !== p.id))
  }

  async function toggleArchive(p: Product) {
    const archived = !p.archived
    const { error: archiveError } = await supabase
      .from('products_catalog')
      .update({ archived })
      .eq('id', p.id)
    if (archiveError) {
      setError(archiveError.message)
      return
    }
    setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, archived } : x)))
  }

  async function persistStock(p: Product) {
    const id = String(p.id)
    const raw = stockDrafts[id]
    if (raw === undefined) return
    const value = raw === '' ? 0 : Number(raw)
    if (!Number.isFinite(value)) {
      setStockDrafts((d) => {
        const next = { ...d }
        delete next[id]
        return next
      })
      return
    }
    if (value === (p.stock_kg ?? 0)) {
      setStockDrafts((d) => {
        const next = { ...d }
        delete next[id]
        return next
      })
      return
    }

    setStockSaving((s) => new Set(s).add(id))
    const { error: stockError } = await supabase
      .from('products_catalog')
      .update({ stock_kg: value })
      .eq('id', p.id)
    setStockSaving((s) => {
      const next = new Set(s)
      next.delete(id)
      return next
    })

    if (stockError) {
      setError(stockError.message)
      return
    }
    setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, stock_kg: value } : x)))
    setStockDrafts((d) => {
      const next = { ...d }
      delete next[id]
      return next
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>Product &amp; Inventory</h1>
          <p style={{ color: '#6b8f5e', marginBottom: 24 }}>Green coffee catalog, stock and multi-currency pricing</p>
        </div>
        <button
          onClick={openAdd}
          style={{ background: '#2d7a3a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          + Add Product
        </button>
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 24 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: 12, color: '#6b8f5e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#2d4a3a', margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {error && (
        <p style={{ background: '#f5d6d6', color: '#9a2a2a', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
          {error}
        </p>
      )}

      {mode && (
        <ProductEditor
          mode={mode}
          draft={draft}
          setDraft={setDraft}
          onSave={saveEditor}
          onCancel={closeEditor}
          saving={saving}
        />
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <input
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...filterSelect, width: 200 }}
        />
        <FilterDropdown label="Name" value={fName} onChange={setFName} options={distinct(products, 'name')} />
        <FilterDropdown label="Grade" value={fGrade} onChange={setFGrade} options={distinct(products, 'grade')} />
        <FilterDropdown label="Variety" value={fVariety} onChange={setFVariety} options={distinct(products, 'variety')} />
        <FilterDropdown label="Crop Year" value={fCropYear} onChange={setFCropYear} options={distinct(products, 'crop_year')} />
        <select value={fAvailability} onChange={(e) => setFAvailability(e.target.value)} style={filterSelect}>
          <option value="">All status</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {filtered.length === 0 ? (
          <p style={{ color: '#999' }}>No products match the current filters.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#6b8f5e', borderBottom: '1px solid #eee' }}>
                  <th style={headCell}>Name</th>
                  <th style={headCell}>Grade</th>
                  <th style={headCell}>Variety</th>
                  <th style={headCell}>Process</th>
                  <th style={headCell}>Crop Year</th>
                  <th style={headCell}>Moisture</th>
                  <th style={headCell}>Defect</th>
                  <th style={headCell}>Packing</th>
                  <th style={headCell}>Stock KG</th>
                  <th style={headCell}>USD/kg</th>
                  <th style={headCell}>THB/kg</th>
                  <th style={headCell}>LAK/kg</th>
                  <th style={headCell}>Status</th>
                  <th style={headCell}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const id = String(p.id)
                  const status = productStatus(p)
                  const usd = p.public_price_usd ?? null
                  const calcThb = usd != null ? Math.round(usd * usdThb) : null
                  const calcLak = usd != null ? Math.round(usd * usdLak) : null
                  const stockValue = stockDrafts[id] ?? (p.stock_kg ?? 0).toString()
                  return (
                    <tr key={id} style={{ borderBottom: '1px solid #f5f5f5', opacity: status === 'Archived' ? 0.6 : 1 }}>
                      <td style={{ ...cell, fontWeight: 600, color: '#2d4a3a' }}>{p.name}</td>
                      <td style={cell}>{p.grade ?? '-'}</td>
                      <td style={cell}>{p.variety ?? '-'}</td>
                      <td style={cell}>{p.process ?? '-'}</td>
                      <td style={cell}>{p.crop_year ?? '-'}</td>
                      <td style={cell}>{p.moisture ?? '-'}</td>
                      <td style={cell}>{p.defect ?? '-'}</td>
                      <td style={cell}>{p.packing ?? '-'}</td>
                      <td style={cell}>
                        <input
                          type="number"
                          value={stockValue}
                          onChange={(e) => setStockDrafts((d) => ({ ...d, [id]: e.target.value }))}
                          onBlur={() => persistStock(p)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                          }}
                          style={{ ...inputStyle, width: 80 }}
                        />
                        {stockSaving.has(id) && <span style={{ fontSize: 11, color: '#6b8f5e' }}>saving…</span>}
                      </td>
                      <td style={{ ...cell, color: '#2d7a3a', fontWeight: 600 }}>{money('$', usd)}</td>
                      <td style={{ ...cell, color: '#2d7a3a', fontWeight: 600 }}>
                        {money('฿', p.public_price_thb)}
                        <div style={{ fontSize: 11, color: '#9aa', fontWeight: 400 }}>
                          {calcThb != null ? `≈ ฿${calcThb.toLocaleString()} calc` : ''}
                        </div>
                      </td>
                      <td style={{ ...cell, color: '#2d7a3a', fontWeight: 600 }}>
                        {money('₭', p.public_price_lak)}
                        <div style={{ fontSize: 11, color: '#9aa', fontWeight: 400 }}>
                          {calcLak != null ? `≈ ₭${calcLak.toLocaleString()} calc` : ''}
                        </div>
                      </td>
                      <td style={cell}>
                        <span style={{ ...STATUS_STYLE[status], padding: '2px 10px', borderRadius: 999, fontSize: 12 }}>{status}</span>
                      </td>
                      <td style={cell}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <ActionButton label="Edit" color="#2d7a3a" onClick={() => openEdit(p)} />
                          <ActionButton
                            label={p.archived ? 'Unarchive' : 'Archive'}
                            color="#9a7b2a"
                            onClick={() => toggleArchive(p)}
                          />
                          <ActionButton label="Delete" color="#9a2a2a" onClick={() => removeProduct(p)} />
                        </div>
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

function FilterDropdown({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={filterSelect}>
      <option value="">All {label}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}

function ActionButton({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ background: '#fff', color, border: `1px solid ${color}`, borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
    >
      {label}
    </button>
  )
}

function ProductEditor({
  mode,
  draft,
  setDraft,
  onSave,
  onCancel,
  saving,
}: {
  mode: EditorMode
  draft: Partial<Product>
  setDraft: React.Dispatch<React.SetStateAction<Partial<Product>>>
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  function field(f: FieldDef) {
    const raw = draft[f.key]
    return (
      <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#6b8f5e' }}>
        {f.label}
        <input
          type={f.type === 'number' ? 'number' : 'text'}
          value={raw == null ? '' : String(raw)}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              [f.key]: f.type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value,
            }))
          }
          style={inputStyle}
        />
      </label>
    )
  }

  const groupStyle: React.CSSProperties = { display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 16 }
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#2d4a3a', margin: '4px 0 8px' }

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 20, border: '1px solid #d4e7d4' }}>
      <h2 style={{ color: '#2d7a3a', fontSize: 18, marginBottom: 16 }}>{mode === 'add' ? 'Add Product' : 'Edit Product'}</h2>

      <p style={sectionTitle}>Catalog</p>
      <div style={groupStyle}>{CATALOG_FIELDS.map(field)}</div>

      <p style={sectionTitle}>Public Prices (per kg)</p>
      <div style={groupStyle}>{PUBLIC_PRICE_FIELDS.map(field)}</div>

      <p style={sectionTitle}>Internal — admin only (not shown to customers)</p>
      <div style={groupStyle}>{INTERNAL_FIELDS.map(field)}</div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 16 }}>
        <input
          type="checkbox"
          checked={draft.available !== false}
          onChange={(e) => setDraft((d) => ({ ...d, available: e.target.checked }))}
        />
        Available to customers
      </label>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onSave}
          disabled={saving}
          style={{ background: '#2d7a3a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          {saving ? 'Saving…' : 'Save Product'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          style={{ background: '#eee', color: '#555', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
