import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { money } from '@/lib/portal'

interface RepCustomer {
  id: string
  customer_code: string | null
  full_name: string | null
  company_name: string | null
}
interface RepOrder {
  customer_id: string | null
  total_usd: number | null
  status: string | null
}

const OUTSTANDING_STATUSES = ['pending_payment', 'payment_submitted']

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <p style={{ fontSize: 12, color: '#6b8f5e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 700, color: '#2d4a3a', margin: 0 }}>{value}</p>
    </div>
  )
}

const statGrid: React.CSSProperties = {
  display: 'grid',
  gap: 16,
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  marginBottom: 24,
}
const card: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflowX: 'auto' }
const th: React.CSSProperties = { padding: '10px 8px', textAlign: 'left', color: '#6b8f5e' }
const thR: React.CSSProperties = { ...th, textAlign: 'right' }

export default async function SalesDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id ?? '').maybeSingle()
  const role = profile?.role ?? 'customer'

  const { data: rep } = await supabase
    .from('sales_reps')
    .select('id, full_name')
    .eq('user_id', user?.id ?? '')
    .maybeSingle()

  // --- Sales-rep view: their own book ---
  if (rep) {
    const { data: customers } = await supabase
      .from('customers')
      .select('id, customer_code, full_name, company_name')
      .eq('sales_rep_id', rep.id)
    const { data: orders } = await supabase.from('orders').select('customer_id, total_usd, status')

    const custs = (customers as RepCustomer[]) ?? []
    const ords = (orders as RepOrder[]) ?? []

    const totalSales = ords.filter((o) => o.status === 'completed').reduce((s, o) => s + (o.total_usd ?? 0), 0)
    const outstanding = ords
      .filter((o) => OUTSTANDING_STATUSES.includes(o.status ?? ''))
      .reduce((s, o) => s + (o.total_usd ?? 0), 0)

    const byCustomer = custs
      .map((c) => {
        const co = ords.filter((o) => o.customer_id === c.id)
        return {
          customer: c,
          orders: co.length,
          sales: co.filter((o) => o.status === 'completed').reduce((s, o) => s + (o.total_usd ?? 0), 0),
          outstanding: co.filter((o) => OUTSTANDING_STATUSES.includes(o.status ?? '')).reduce((s, o) => s + (o.total_usd ?? 0), 0),
        }
      })
      .sort((a, b) => b.sales - a.sales)

    return (
      <div>
        <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>Sales Dashboard</h1>
        <p style={{ color: '#6b8f5e', marginBottom: 20 }}>{rep.full_name}</p>

        <div style={statGrid}>
          <Stat label="My Customers" value={custs.length.toLocaleString()} />
          <Stat label="Total Sales" value={money('$', totalSales)} />
          <Stat label="Outstanding" value={money('$', outstanding)} />
          <Stat label="Total Orders" value={ords.length.toLocaleString()} />
        </div>

        <h2 style={{ fontSize: 16, color: '#2d4a3a' }}>Orders by Customer</h2>
        <div style={card}>
          {byCustomer.length === 0 ? (
            <p style={{ color: '#999', padding: 16 }}>No customers assigned yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 560 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <th style={th}>Customer</th>
                  <th style={thR}>Orders</th>
                  <th style={thR}>Sales</th>
                  <th style={thR}>Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {byCustomer.map((row) => (
                  <tr key={row.customer.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ fontWeight: 600, color: '#2d4a3a' }}>{row.customer.full_name || row.customer.company_name || '—'}</div>
                      <div style={{ fontSize: 12, color: '#9aa' }}>{row.customer.customer_code ?? '—'}</div>
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>{row.orders}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>{money('$', row.sales)}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>{money('$', row.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    )
  }

  // --- Admin / manager view: per-rep overview ---
  if (role === 'admin' || role === 'manager') {
    const { data: reps } = await supabase.from('sales_reps').select('id, full_name, active').order('full_name')
    const { data: stats } = await supabase.from('sales_rep_stats').select('sales_rep_id, customer_count, total_sales_usd, outstanding_usd')
    const statsById: Record<string, { customer_count: number; total_sales_usd: number; outstanding_usd: number }> = {}
    for (const s of stats ?? []) statsById[s.sales_rep_id] = s

    const repRows = (reps as { id: string; full_name: string; active: boolean }[]) ?? []
    const totals = repRows.reduce(
      (acc, r) => {
        const s = statsById[r.id]
        return {
          customers: acc.customers + (s?.customer_count ?? 0),
          sales: acc.sales + (s?.total_sales_usd ?? 0),
          outstanding: acc.outstanding + (s?.outstanding_usd ?? 0),
        }
      },
      { customers: 0, sales: 0, outstanding: 0 }
    )

    return (
      <div>
        <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>Sales Dashboard</h1>
        <p style={{ color: '#6b8f5e', marginBottom: 20 }}>
          Team overview ·{' '}
          <Link href="/admin/sales-reps" style={{ color: '#2d7a3a' }}>
            manage reps
          </Link>
        </p>

        <div style={statGrid}>
          <Stat label="Sales Reps" value={repRows.length.toLocaleString()} />
          <Stat label="Total Customers" value={totals.customers.toLocaleString()} />
          <Stat label="Total Sales" value={money('$', totals.sales)} />
          <Stat label="Outstanding" value={money('$', totals.outstanding)} />
        </div>

        <h2 style={{ fontSize: 16, color: '#2d4a3a' }}>By Sales Rep</h2>
        <div style={card}>
          {repRows.length === 0 ? (
            <p style={{ color: '#999', padding: 16 }}>
              No sales reps yet.{' '}
              <Link href="/admin/sales-reps" style={{ color: '#2d7a3a' }}>
                Add one →
              </Link>
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 560 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <th style={th}>Rep</th>
                  <th style={thR}>Customers</th>
                  <th style={thR}>Sales</th>
                  <th style={thR}>Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {repRows.map((r) => {
                  const s = statsById[r.id]
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f5f5f5', opacity: r.active ? 1 : 0.55 }}>
                      <td style={{ padding: '10px 8px', fontWeight: 600, color: '#2d4a3a' }}>{r.full_name}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>{(s?.customer_count ?? 0).toLocaleString()}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>{money('$', s?.total_sales_usd ?? 0)}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>{money('$', s?.outstanding_usd ?? 0)}</td>
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

  // --- Sales user with no linked rep record ---
  return (
    <div>
      <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>Sales Dashboard</h1>
      <p style={{ color: '#6b8f5e' }}>
        Your account isn&apos;t linked to a sales-rep record yet. Ask an admin to link your login on the Sales Reps page.
      </p>
    </div>
  )
}
