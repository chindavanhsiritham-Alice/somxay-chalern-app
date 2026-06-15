import { createClient } from '@/lib/supabase/server'
import { getLatestRates, readRate } from '@/lib/exchangeRates'

const CURRENCY_NAMES: Record<string, string> = {
  LAK: 'Lao Kip',
  THB: 'Thai Baht',
  USD: 'US Dollar',
  EUR: 'Euro',
  CNY: 'Chinese Yuan',
  JPY: 'Japanese Yen',
  VND: 'Vietnamese Dong',
  GBP: 'British Pound',
  AUD: 'Australian Dollar',
}

function formatRate(n: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(n)
}

function formatDate(d?: string) {
  if (!d) return '-'
  const parsed = new Date(d)
  return Number.isNaN(parsed.getTime()) ? d : parsed.toISOString().slice(0, 10)
}

export default async function ExchangeRates() {
  const supabase = await createClient()
  const rates = await getLatestRates(supabase)

  return (
    <div>
      <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>Exchange Rates</h1>
      <p style={{ color: '#6b8f5e', marginBottom: 24 }}>Currency conversion rates against the US Dollar</p>

      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {rates.length === 0 ? (
          <p style={{ color: '#999' }}>
            No exchange rates recorded yet. Add rows to the <code>exchange_rates</code> table to see them here.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#6b8f5e', borderBottom: '1px solid #eee' }}>
                <th style={{ padding: '8px 0' }}>Currency</th>
                <th>Code</th>
                <th>Rate (per 1 USD)</th>
                <th>As of</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((row, i) => {
                const { code, rate, date } = readRate(row)
                const upper = code?.toUpperCase() ?? ''
                return (
                  <tr key={`${upper}-${i}`} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '10px 0', fontWeight: 600, color: '#2d4a3a' }}>
                      {CURRENCY_NAMES[upper] ?? upper ?? '-'}
                    </td>
                    <td style={{ color: '#6b8f5e' }}>{upper || '-'}</td>
                    <td style={{ color: '#2d7a3a', fontWeight: 600 }}>
                      {rate != null ? formatRate(rate) : '-'}
                    </td>
                    <td style={{ color: '#6b8f5e' }}>{formatDate(date)}</td>
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
