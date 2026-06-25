import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Customer } from '@/lib/crm/types'
import type { Quotation, QuotationItem } from '@/lib/sales/types'
import PrintButton from './PrintButton'

function customerLabel(c: Customer) {
  return c.company_name ?? c.shop_name ?? c.owner_name ?? c.customer_code ?? c.id
}

export default async function QuotationPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: quotation }, { data: items }] = await Promise.all([
    supabase.from('quotations').select('*, customers(*)').eq('id', id).maybeSingle(),
    supabase.from('quotation_items').select('*').eq('quotation_id', id).order('sort_order'),
  ])

  if (!quotation) notFound()

  const q = quotation as unknown as Quotation & { customers: Customer }
  const rows = (items ?? []) as QuotationItem[]

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 32, fontFamily: 'sans-serif', color: '#222' }}>
      <PrintButton />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #2d7a3a', paddingBottom: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#2d7a3a', margin: 0, fontSize: 26 }}>☕ Somxay Coffee</h1>
          <p style={{ margin: '4px 0 0', color: '#777', fontSize: 13 }}>ใบเสนอราคา / Quotation</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 18, color: '#2d4a3a' }}>{q.quotation_number}</p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#777' }}>วันที่: {q.quotation_date}</p>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#777' }}>หมดอายุ: {q.expiry_date ?? '-'}</p>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ color: '#2d4a3a', margin: '0 0 6px', fontSize: 14 }}>เรียน / To</h3>
        <p style={{ margin: '2px 0' }}>{customerLabel(q.customers)}</p>
        <p style={{ margin: '2px 0', color: '#555', fontSize: 13 }}>{q.customers.phone ?? ''}</p>
        <p style={{ margin: '2px 0', color: '#555', fontSize: 13 }}>{q.customers.billing_address ?? ''}</p>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 24 }}>
        <thead>
          <tr style={{ background: '#f5f7f2', textAlign: 'left' }}>
            <th style={{ padding: '8px 10px', borderBottom: '2px solid #2d7a3a' }}>สินค้า</th>
            <th style={{ padding: '8px 10px', borderBottom: '2px solid #2d7a3a', textAlign: 'right' }}>กก.</th>
            <th style={{ padding: '8px 10px', borderBottom: '2px solid #2d7a3a', textAlign: 'right' }}>ราคา/กก.</th>
            <th style={{ padding: '8px 10px', borderBottom: '2px solid #2d7a3a', textAlign: 'right' }}>ส่วนลด</th>
            <th style={{ padding: '8px 10px', borderBottom: '2px solid #2d7a3a', textAlign: 'right' }}>รวม</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((it) => (
            <tr key={it.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px 10px' }}>{it.product_name ?? '-'}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right' }}>{it.kg.toLocaleString()}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right' }}>{it.unit_price.toLocaleString()}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                {it.discount_percent ? `${it.discount_percent}%` : ''} {it.discount_amount ? it.discount_amount.toLocaleString() : ''}
              </td>
              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{it.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <table style={{ fontSize: 13 }}>
          <tbody>
            <tr>
              <td style={{ padding: '4px 16px', color: '#777' }}>ยอดก่อนหักส่วนลด</td>
              <td style={{ padding: '4px 0', textAlign: 'right' }}>{q.subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 16px', color: '#777' }}>ส่วนลดรวม</td>
              <td style={{ padding: '4px 0', textAlign: 'right' }}>{q.discount_total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 16px', fontWeight: 700, color: '#2d4a3a', borderTop: '2px solid #2d7a3a' }}>รวมทั้งสิ้น</td>
              <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, color: '#2d7a3a', borderTop: '2px solid #2d7a3a' }}>
                {q.total.toLocaleString(undefined, { maximumFractionDigits: 2 })} {q.currency}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {q.terms && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ color: '#2d4a3a', margin: '0 0 6px', fontSize: 14 }}>เงื่อนไข / Terms</h3>
          <p style={{ margin: 0, fontSize: 13, color: '#555', whiteSpace: 'pre-wrap' }}>{q.terms}</p>
        </div>
      )}

      {q.notes && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ color: '#2d4a3a', margin: '0 0 6px', fontSize: 14 }}>หมายเหตุ</h3>
          <p style={{ margin: 0, fontSize: 13, color: '#555', whiteSpace: 'pre-wrap' }}>{q.notes}</p>
        </div>
      )}

      <p style={{ marginTop: 32, fontSize: 12, color: '#999', textAlign: 'center' }}>ใบเสนอราคานี้มีอายุจนถึงวันที่ {q.expiry_date ?? '-'}</p>
    </div>
  )
}
