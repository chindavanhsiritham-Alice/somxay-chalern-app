import { createClient } from '@/lib/supabase/server'
import { getLatestRates, readRate, type RateRow } from '@/lib/exchangeRates'

interface Product {
  id: string | number
  name: string
  grade?: string | null
  public_price_usd?: number | null
  stock_kg?: number | null
  available?: boolean | null
}

function formatUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export default async function AdminProducts() {
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('products_catalog')
    .select('*')
    .order('name')

  const rates = await getLatestRates(supabase)
  // Lao Kip is the company's home currency; show converted price when available.
  const lak: RateRow | undefined = rates.find((r) => readRate(r).code?.toUpperCase() === 'LAK')
  const lakRate = lak ? readRate(lak).rate : undefined

  const rows: Product[] = products ?? []
  const available = rows.filter((p) => p.available !== false).length
  const totalStock = rows.reduce((sum, p) => sum + (Number(p.stock_kg) || 0), 0)

  const stats = [
    { label: 'Total Products', value: rows.length.toString() },
    { label: 'Available', value: available.toString() },
    { label: 'In Stock', value: `${totalStock.toLocaleString()} kg` },
  ]

  return (
    <div>
      <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>Product &amp; Inventory</h1>
      <p style={{ color: '#6b8f5e', marginBottom: 24 }}>Green coffee catalog and stock levels</p>

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
        {rows.length === 0 ? (
          <p style={{ color: '#999' }}>No products yet. Add products to the catalog to see them here.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#6b8f5e', borderBottom: '1px solid #eee' }}>
                <th style={{ padding: '8px 0' }}>Product</th>
                <th>Grade</th>
                <th>Stock</th>
                <th>Price (USD/kg)</th>
                {lakRate != null && <th>Price (LAK/kg)</th>}
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const priceUsd = Number(p.public_price_usd) || 0
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '10px 0', fontWeight: 600, color: '#2d4a3a' }}>{p.name}</td>
                    <td style={{ color: '#6b8f5e' }}>{p.grade ?? '-'}</td>
                    <td>{p.stock_kg != null ? `${Number(p.stock_kg).toLocaleString()} kg` : '-'}</td>
                    <td style={{ color: '#2d7a3a', fontWeight: 600 }}>{formatUSD(priceUsd)}</td>
                    {lakRate != null && (
                      <td style={{ color: '#6b8f5e' }}>
                        ₭{Math.round(priceUsd * lakRate).toLocaleString()}
                      </td>
                    )}
                    <td>
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
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
