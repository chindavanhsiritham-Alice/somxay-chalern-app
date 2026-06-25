'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  PIPELINE_STAGE_LABELS,
  PIPELINE_STAGES,
  CUSTOMER_CATEGORY_LABELS,
  type Customer,
  type PipelineStage,
  type SalesRep,
} from '@/lib/crm/types'

const primaryButton: React.CSSProperties = { background: '#2d7a3a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const secondaryButton: React.CSSProperties = { background: '#eef2ea', color: '#2d4a3a', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const fieldInput: React.CSSProperties = { width: '100%', padding: '7px 9px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }
const th: React.CSSProperties = { padding: '10px 14px', fontWeight: 600, color: '#2d4a3a', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '10px 14px', color: '#444' }

const STAGE_COLORS: Record<PipelineStage, string> = {
  lead: '#9ca3af',
  interested: '#60a5fa',
  sample_sent: '#a78bfa',
  quotation: '#fbbf24',
  negotiation: '#fb923c',
  won: '#34d399',
  lost: '#f87171',
}

export default function SalesPipelineManager({
  initialCustomers,
  salesReps,
}: {
  initialCustomers: Customer[]
  salesReps: SalesRep[]
}) {
  const supabase = createClient()
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [salesRepFilter, setSalesRepFilter] = useState('')
  const [dragOverStage, setDragOverStage] = useState<PipelineStage | null>(null)

  const filtered = useMemo(
    () => (salesRepFilter ? customers.filter((c) => c.assigned_sales_rep === salesRepFilter) : customers),
    [customers, salesRepFilter]
  )

  const columns = useMemo(() => {
    const map: Record<PipelineStage, Customer[]> = {
      lead: [],
      interested: [],
      sample_sent: [],
      quotation: [],
      negotiation: [],
      won: [],
      lost: [],
    }
    filtered.forEach((c) => map[c.pipeline_stage].push(c))
    return map
  }, [filtered])

  const salesRepName = (id: string | null) => salesReps.find((s) => s.id === id)?.full_name ?? '-'

  async function moveStage(customerId: string, stage: PipelineStage) {
    setCustomers((prev) => prev.map((c) => (c.id === customerId ? { ...c, pipeline_stage: stage } : c)))
    await supabase.from('customers').update({ pipeline_stage: stage }).eq('id', customerId)
  }

  function handleDrop(e: React.DragEvent, stage: PipelineStage) {
    e.preventDefault()
    setDragOverStage(null)
    const customerId = e.dataTransfer.getData('text/plain')
    if (customerId) moveStage(customerId, stage)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>Sales Pipeline</h1>
          <p style={{ color: '#6b8f5e' }}>{filtered.length.toLocaleString()} ลูกค้าในไปป์ไลน์</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={salesRepFilter} onChange={(e) => setSalesRepFilter(e.target.value)} style={{ ...fieldInput, width: 'auto' }}>
            <option value="">เซลส์ทั้งหมด</option>
            {salesReps.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name ?? s.id}
              </option>
            ))}
          </select>
          <button style={view === 'kanban' ? primaryButton : secondaryButton} onClick={() => setView('kanban')}>
            Kanban
          </button>
          <button style={view === 'list' ? primaryButton : secondaryButton} onClick={() => setView('list')}>
            รายการ
          </button>
        </div>
      </div>

      {view === 'kanban' ? (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {PIPELINE_STAGES.map((stage) => (
            <div
              key={stage}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOverStage(stage)
              }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={(e) => handleDrop(e, stage)}
              style={{
                background: dragOverStage === stage ? '#eef2ea' : '#f5f7f2',
                borderRadius: 12,
                padding: 10,
                minWidth: 240,
                flex: '0 0 240px',
                minHeight: 200,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: STAGE_COLORS[stage] }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#2d4a3a' }}>{PIPELINE_STAGE_LABELS[stage]}</span>
                <span style={{ fontSize: 12, color: '#999' }}>({columns[stage].length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {columns[stage].map((c) => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', c.id)}
                    style={{ background: '#fff', borderRadius: 8, padding: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', cursor: 'grab' }}
                  >
                    <Link href={`/admin/customers/${c.id}`} style={{ color: '#2d7a3a', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                      {c.company_name ?? c.shop_name ?? c.customer_code}
                    </Link>
                    <div style={{ fontSize: 12, color: '#777', marginTop: 2 }}>{c.owner_name ?? '-'}</div>
                    <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{c.province ?? '-'} · {salesRepName(c.assigned_sales_rep)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f7f2', textAlign: 'left' }}>
                <th style={th}>บริษัท / ร้าน</th>
                <th style={th}>เจ้าของ</th>
                <th style={th}>ประเภท</th>
                <th style={th}>จังหวัด</th>
                <th style={th}>ขั้นตอน</th>
                <th style={th}>เซลส์</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>
                    <Link href={`/admin/customers/${c.id}`} style={{ color: '#2d7a3a', fontWeight: 600, textDecoration: 'none' }}>
                      {c.company_name ?? c.shop_name ?? c.customer_code}
                    </Link>
                  </td>
                  <td style={td}>{c.owner_name ?? '-'}</td>
                  <td style={td}>{c.category ? CUSTOMER_CATEGORY_LABELS[c.category] : '-'}</td>
                  <td style={td}>{c.province ?? '-'}</td>
                  <td style={td}>
                    <select
                      value={c.pipeline_stage}
                      onChange={(e) => moveStage(c.id, e.target.value as PipelineStage)}
                      style={{ ...fieldInput, width: 'auto' }}
                    >
                      {PIPELINE_STAGES.map((stage) => (
                        <option key={stage} value={stage}>
                          {PIPELINE_STAGE_LABELS[stage]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={td}>{salesRepName(c.assigned_sales_rep)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
