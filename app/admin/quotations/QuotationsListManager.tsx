'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { QUOTATION_STATUS_LABELS, type QuotationStatus } from '@/lib/sales/types'
import { QUOTATIONS_PAGE_SIZE } from '@/lib/sales/data'
import type { SalesRep } from '@/lib/crm/types'
import type { QuotationRow } from './page'

const fieldLabel: React.CSSProperties = { fontSize: 11, color: '#6b8f5e', marginBottom: 4, display: 'block' }
const fieldInput: React.CSSProperties = { width: '100%', padding: '7px 9px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }
const primaryButton: React.CSSProperties = { background: '#2d7a3a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }
const secondaryButton: React.CSSProperties = { background: '#eef2ea', color: '#2d4a3a', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const th: React.CSSProperties = { padding: '10px 14px', fontWeight: 600, color: '#2d4a3a', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '10px 14px', color: '#444' }
const badge: React.CSSProperties = { display: 'inline-block', padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }

const STATUS_COLORS: Record<QuotationStatus, { bg: string; fg: string }> = {
  draft: { bg: '#eee', fg: '#777' },
  sent: { bg: '#dbe9fb', fg: '#1f5c9e' },
  accepted: { bg: '#d9f0d4', fg: '#256029' },
  rejected: { bg: '#f5d6d6', fg: '#9a2a2a' },
  expired: { bg: '#f0e0c8', fg: '#915c1c' },
  converted: { bg: '#dcd0f5', fg: '#5c2a9a' },
}

const STATUS_OPTIONS = Object.keys(QUOTATION_STATUS_LABELS) as QuotationStatus[]

function customerLabel(c: QuotationRow['customers']) {
  if (!c) return '-'
  return c.company_name ?? c.shop_name ?? c.customer_code ?? '-'
}

function formatMoney(n: number, currency: string) {
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function QuotationsListManager({
  initialQuotations,
  initialCount,
  salesReps,
}: {
  initialQuotations: QuotationRow[]
  initialCount: number
  salesReps: SalesRep[]
}) {
  const supabase = createClient()
  const [quotations, setQuotations] = useState<QuotationRow[]>(initialQuotations)
  const [count, setCount] = useState(initialCount)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [salesRepId, setSalesRepId] = useState('')

  const isFirstRender = useRef(true)

  const fetchPage = useCallback(
    async (pageIndex: number) => {
      setLoading(true)
      let query = supabase
        .from('quotations')
        .select('*, customers(customer_code, company_name, shop_name)', { count: 'exact' })

      const safeSearch = search.trim().replace(/[,()%]/g, '')
      if (safeSearch) query = query.ilike('quotation_number', `%${safeSearch}%`)
      if (status) query = query.eq('status', status)
      if (salesRepId) query = query.eq('sales_rep_id', salesRepId)

      const from = pageIndex * QUOTATIONS_PAGE_SIZE
      const to = from + QUOTATIONS_PAGE_SIZE - 1
      const { data, count: total } = await query.order('created_at', { ascending: false }).range(from, to)

      setQuotations((data ?? []) as unknown as QuotationRow[])
      setCount(total ?? 0)
      setPage(pageIndex)
      setLoading(false)
    },
    [supabase, search, status, salesRepId]
  )

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const timer = setTimeout(() => fetchPage(0), 300)
    return () => clearTimeout(timer)
  }, [fetchPage])

  const salesRepName = (id: string | null) => salesReps.find((s) => s.id === id)?.full_name ?? '-'
  const totalPages = Math.max(1, Math.ceil(count / QUOTATIONS_PAGE_SIZE))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>Quotations</h1>
          <p style={{ color: '#6b8f5e', marginBottom: 20 }}>{count.toLocaleString()} ใบเสนอราคาทั้งหมด</p>
        </div>
        <Link href="/admin/quotations/new" style={primaryButton}>
          + สร้างใบเสนอราคา
        </Link>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 14, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <label>
            <span style={fieldLabel}>ค้นหา (เลขที่ใบเสนอราคา)</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} style={fieldInput} placeholder="QT-000001" />
          </label>
          <label>
            <span style={fieldLabel}>สถานะ</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={fieldInput}>
              <option value="">ทั้งหมด</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {QUOTATION_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span style={fieldLabel}>เซลส์</span>
            <select value={salesRepId} onChange={(e) => setSalesRepId(e.target.value)} style={fieldInput}>
              <option value="">ทั้งหมด</option>
              {salesReps.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name ?? s.id}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#999' }}>กำลังโหลด...</p>
      ) : quotations.length === 0 ? (
        <p style={{ color: '#999' }}>ไม่พบใบเสนอราคา</p>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f7f2', textAlign: 'left' }}>
                <th style={th}>เลขที่</th>
                <th style={th}>ลูกค้า</th>
                <th style={th}>วันที่</th>
                <th style={th}>หมดอายุ</th>
                <th style={th}>ยอดรวม</th>
                <th style={th}>สถานะ</th>
                <th style={th}>การอนุมัติ</th>
                <th style={th}>เซลส์</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map((q) => (
                <tr key={q.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>
                    <Link href={`/admin/quotations/${q.id}`} style={{ color: '#2d7a3a', fontWeight: 600, textDecoration: 'none' }}>
                      {q.quotation_number}
                    </Link>
                  </td>
                  <td style={td}>{customerLabel(q.customers)}</td>
                  <td style={td}>{q.quotation_date}</td>
                  <td style={td}>{q.expiry_date ?? '-'}</td>
                  <td style={td}>{formatMoney(q.total, q.currency)}</td>
                  <td style={td}>
                    <span style={{ ...badge, background: STATUS_COLORS[q.status].bg, color: STATUS_COLORS[q.status].fg }}>
                      {QUOTATION_STATUS_LABELS[q.status]}
                    </span>
                  </td>
                  <td style={td}>{q.approval_status === 'pending_approval' ? '⏳ รออนุมัติ' : q.approval_status === 'approved' ? '✅ อนุมัติแล้ว' : q.approval_status === 'rejected' ? '❌ ถูกปฏิเสธ' : '-'}</td>
                  <td style={td}>{salesRepName(q.sales_rep_id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {count > QUOTATIONS_PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          <button style={secondaryButton} disabled={page <= 0 || loading} onClick={() => fetchPage(page - 1)}>
            ← ก่อนหน้า
          </button>
          <span style={{ fontSize: 13, color: '#555' }}>
            หน้า {page + 1} / {totalPages}
          </span>
          <button style={secondaryButton} disabled={page + 1 >= totalPages || loading} onClick={() => fetchPage(page + 1)}>
            ถัดไป →
          </button>
        </div>
      )}
    </div>
  )
}
