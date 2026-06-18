import { createClient } from '@/lib/supabase/server'

interface PortalProduct {
  id: string | number
  name: string
  grade: string | null
  variety: string | null
  process: string | null
  crop_year: string | null
  packing: string | null
  public_price_usd: number | null
  public_price_thb: number | null
  public_price_lak: number | null
  available: boolean | null
  archived: boolean | null
}

function price(prefix: string, value: number | null) {
  if (value == null) return '-'
  return `${prefix}${Number(value).toLocaleString()}`
}

export default async function PortalCatalog() {
  const supabase = await createClient()
  // Select only customer-safe columns — internal cost/margin never leave the server.
  const { data } = await supabase
    .from('products_catalog')
    .select(
      'id, name, grade, variety, process, crop_year, packing, public_price_usd, public_price_thb, public_price_lak, available, archived'
    )
    .eq('available', true)
    .order('name')

  const products = ((data as PortalProduct[]) ?? []).filter((p) => !p.archived)

  return (
    <div>
      <h1 style={{ color: '#2d7a3a' }}>Product Catalog</h1>
      <p style={{ color: '#6b8f5e', marginBottom: 16 }}>Available green coffee lots</p>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {products.map((p) => (
          <div key={p.id} style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <h3 style={{ margin: 0, color: '#2d4a3a' }}>{p.name}</h3>
              <span style={{ background: '#d4f0d4', color: '#256029', padding: '2px 10px', borderRadius: 999, fontSize: 11 }}>Available</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0' }}>
              {[p.grade, p.variety, p.process].filter(Boolean).map((tag) => (
                <span key={tag} style={{ background: '#eef5ea', color: '#6b8f5e', padding: '2px 8px', borderRadius: 6, fontSize: 12 }}>
                  {tag}
                </span>
              ))}
            </div>

            <dl style={{ margin: 0, fontSize: 13, color: '#555', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 10px' }}>
              <dt style={{ color: '#9aa' }}>Crop Year</dt>
              <dd style={{ margin: 0 }}>{p.crop_year ?? '-'}</dd>
              <dt style={{ color: '#9aa' }}>Packing</dt>
              <dd style={{ margin: 0 }}>{p.packing ?? '-'}</dd>
            </dl>

            <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 12, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontWeight: 700, color: '#2d7a3a' }}>{price('$', p.public_price_usd)}/kg</span>
              <span style={{ fontSize: 13, color: '#6b8f5e' }}>{price('฿', p.public_price_thb)}/kg</span>
              <span style={{ fontSize: 13, color: '#6b8f5e' }}>{price('₭', p.public_price_lak)}/kg</span>
            </div>
          </div>
        ))}
        {products.length === 0 && <p>No products available yet.</p>}
      </div>
    </div>
  )
}
