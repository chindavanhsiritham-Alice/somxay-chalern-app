import { createClient } from '@/lib/supabase/server'

export default async function PortalCatalog() {
  const supabase = await createClient()
  const { data: products } = await supabase
    .from('products_catalog')
    .select('*')
    .eq('available', true)

  return (
    <div>
      <h1 style={{ color: '#2d7a3a' }}>Product Catalog</h1>
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', marginTop: 16 }}>
        {(products ?? []).map((p) => (
          <div key={p.id} style={{ background: '#fff', borderRadius: 12, padding: 16 }}>
            <h3 style={{ margin: 0 }}>{p.name}</h3>
            <p style={{ color: '#6b8f5e', fontSize: 13 }}>{p.grade}</p>
            <p style={{ fontWeight: 600, color: '#2d7a3a' }}>${p.public_price_usd}/kg</p>
          </div>
        ))}
        {(!products || products.length === 0) && <p>No products available yet.</p>}
      </div>
    </div>
  )
}
