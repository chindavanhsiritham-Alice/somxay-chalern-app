'use client'

import { useMemo, useState } from 'react'
import { cart } from '@/lib/cart'
import { PACKAGE_OPTIONS, money } from '@/lib/portal'

export interface PortalProduct {
  id: string
  name: string
  grade: string | null
  variety: string | null
  process: string | null
  crop_year: string | null
  moisture: string | null
  defect: string | null
  packing: string | null
  available_kg: number | null
  public_price_usd: number | null
  public_price_thb: number | null
  public_price_lak: number | null
}

export default function ProductBrowser({ products, approved }: { products: PortalProduct[]; approved: boolean }) {
  const [search, setSearch] = useState('')
  const [added, setAdded] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) =>
      [p.name, p.grade, p.variety, p.process, p.crop_year].filter(Boolean).join(' ').toLowerCase().includes(q)
    )
  }, [products, search])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ color: '#2d4a3a', margin: '0 0 4px' }}>Green Coffee</h1>
      </div>
      <p style={{ color: '#6b8f5e', marginTop: 0 }}>Browse available lots and add them to your cart.</p>

      <input
        placeholder="Search by name, variety, process…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: '100%', maxWidth: 360, padding: '9px 12px', border: '1px solid #ccc', borderRadius: 10, fontSize: 14, marginBottom: 20, boxSizing: 'border-box' }}
      />

      {filtered.length === 0 ? (
        <p style={{ color: '#999' }}>No products available right now.</p>
      ) : (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {filtered.map((p) => (
            <ProductCard key={p.id} p={p} approved={approved} added={added === p.id} onAdd={() => setAdded(p.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProductCard({
  p,
  approved,
  added,
  onAdd,
}: {
  p: PortalProduct
  approved: boolean
  added: boolean
  onAdd: () => void
}) {
  const available = p.available_kg ?? 0
  const [pkg, setPkg] = useState<string>(String(PACKAGE_OPTIONS[0]))
  const [custom, setCustom] = useState('')

  const qty = pkg === 'custom' ? Number(custom) || 0 : Number(pkg)
  const outOfStock = available <= 0
  const tooMuch = qty > available
  const canAdd = approved && !outOfStock && qty > 0 && !tooMuch

  function add() {
    cart.add({
      catalog_product_id: p.id,
      name: p.name,
      grade: p.grade,
      unit_price_usd: p.public_price_usd,
      unit_price_thb: p.public_price_thb,
      unit_price_lak: p.public_price_lak,
      available_kg: p.available_kg,
      quantity_kg: qty,
    })
    onAdd()
  }

  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <h3 style={{ margin: 0, color: '#2d4a3a' }}>{p.name}</h3>
        <span
          style={{
            background: outOfStock ? '#f5d6d6' : '#d4f0d4',
            color: outOfStock ? '#9a2a2a' : '#256029',
            padding: '2px 10px',
            borderRadius: 999,
            fontSize: 11,
            whiteSpace: 'nowrap',
            height: 'fit-content',
          }}
        >
          {outOfStock ? 'Out of stock' : `${available.toLocaleString()} kg`}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0' }}>
        {[p.grade, p.variety, p.process].filter(Boolean).map((t) => (
          <span key={t} style={{ background: '#eef5ea', color: '#6b8f5e', padding: '2px 8px', borderRadius: 6, fontSize: 12 }}>
            {t}
          </span>
        ))}
      </div>

      <dl style={{ margin: 0, fontSize: 12.5, color: '#555', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '3px 10px' }}>
        <dt style={{ color: '#9aa' }}>Crop Year</dt>
        <dd style={{ margin: 0 }}>{p.crop_year ?? '-'}</dd>
        <dt style={{ color: '#9aa' }}>Moisture</dt>
        <dd style={{ margin: 0 }}>{p.moisture ?? '-'}</dd>
        <dt style={{ color: '#9aa' }}>Defect</dt>
        <dd style={{ margin: 0 }}>{p.defect ?? '-'}</dd>
        <dt style={{ color: '#9aa' }}>Packing</dt>
        <dd style={{ margin: 0 }}>{p.packing ?? '-'}</dd>
      </dl>

      <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 12, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontWeight: 700, color: '#2d7a3a' }}>{money('$', p.public_price_usd)}/kg</span>
        <span style={{ fontSize: 13, color: '#6b8f5e' }}>{money('฿', p.public_price_thb)}/kg · {money('₭', p.public_price_lak)}/kg</span>
      </div>

      {!outOfStock && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select
              value={pkg}
              onChange={(e) => setPkg(e.target.value)}
              style={{ flex: 1, minWidth: 120, padding: '8px', border: '1px solid #ccc', borderRadius: 8, fontSize: 13 }}
            >
              {PACKAGE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o} kg
                </option>
              ))}
              <option value="custom">Custom kg</option>
            </select>
            {pkg === 'custom' && (
              <input
                type="number"
                min={1}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="kg"
                style={{ width: 90, padding: '8px', border: '1px solid #ccc', borderRadius: 8, fontSize: 13 }}
              />
            )}
          </div>
          {qty > 0 && (
            <div style={{ fontSize: 13, color: '#2d4a3a' }}>
              Subtotal: <strong>{money('$', qty * (p.public_price_usd ?? 0))}</strong>
            </div>
          )}
          {tooMuch && <div style={{ fontSize: 12, color: '#9a2a2a' }}>Only {available.toLocaleString()} kg available.</div>}
          <button
            onClick={add}
            disabled={!canAdd}
            style={{
              background: canAdd ? '#2d7a3a' : '#cfe0cf',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 14,
              fontWeight: 600,
              cursor: canAdd ? 'pointer' : 'default',
            }}
          >
            {added ? 'Added ✓' : 'Add to cart'}
          </button>
          {!approved && (
            <div style={{ fontSize: 12, color: '#8a6d1a' }}>Ordering unlocks once your account is approved.</div>
          )}
        </div>
      )}
    </div>
  )
}
