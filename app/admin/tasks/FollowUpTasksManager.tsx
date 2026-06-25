'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  FOLLOWUP_STATUS_LABELS,
  FOLLOWUP_TASK_TYPE_LABELS,
  followUpDisplayStatus,
  type FollowUpStatus,
  type FollowUpTaskType,
} from '@/lib/sales/types'
import { todayDateString } from '@/lib/sales/data'
import type { SalesRep, Customer } from '@/lib/crm/types'
import type { FollowUpRow } from './page'

const fieldLabel: React.CSSProperties = { fontSize: 11, color: '#6b8f5e', marginBottom: 4, display: 'block' }
const fieldInput: React.CSSProperties = { width: '100%', padding: '7px 9px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }
const primaryButton: React.CSSProperties = { background: '#2d7a3a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const secondaryButton: React.CSSProperties = { background: '#eef2ea', color: '#2d4a3a', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const card: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const th: React.CSSProperties = { padding: '10px 14px', fontWeight: 600, color: '#2d4a3a', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '10px 14px', color: '#444' }
const badge: React.CSSProperties = { display: 'inline-block', padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }

const STATUS_COLORS: Record<FollowUpStatus, { bg: string; fg: string }> = {
  open: { bg: '#dbe9fb', fg: '#1f5c9e' },
  done: { bg: '#d9f0d4', fg: '#256029' },
  overdue: { bg: '#f5d6d6', fg: '#9a2a2a' },
}

const TASK_TYPE_OPTIONS = Object.keys(FOLLOWUP_TASK_TYPE_LABELS) as FollowUpTaskType[]

function customerLabel(c: FollowUpRow['customers']) {
  if (!c) return '-'
  return c.company_name ?? c.shop_name ?? c.customer_code ?? '-'
}

export default function FollowUpTasksManager({
  initialFollowUps,
  salesReps,
  customers,
}: {
  initialFollowUps: FollowUpRow[]
  salesReps: SalesRep[]
  customers: Pick<Customer, 'id' | 'customer_code' | 'company_name' | 'shop_name'>[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const [followups, setFollowups] = useState(initialFollowUps)
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [customerId, setCustomerId] = useState('')
  const [salesRepId, setSalesRepId] = useState('')
  const [dueDate, setDueDate] = useState(todayDateString())
  const [taskType, setTaskType] = useState<FollowUpTaskType>('follow_up')
  const [note, setNote] = useState('')

  const salesRepName = (id: string | null) => salesReps.find((s) => s.id === id)?.full_name ?? '-'

  const filtered = useMemo(() => {
    if (!statusFilter) return followups
    return followups.filter((f) => followUpDisplayStatus(f) === statusFilter)
  }, [followups, statusFilter])

  const createTask = async () => {
    if (!customerId || !dueDate) {
      setError('กรุณาเลือกลูกค้าและวันครบกำหนด')
      return
    }
    setBusy(true)
    setError('')
    const { data, error: insErr } = await supabase
      .from('sales_followups')
      .insert({
        customer_id: customerId,
        sales_rep_id: salesRepId || null,
        due_date: dueDate,
        task_type: taskType,
        note: note || null,
        status: 'open',
      })
      .select('*, customers(customer_code, company_name, shop_name)')
      .single()
    setBusy(false)
    if (insErr || !data) {
      setError(insErr?.message ?? 'สร้างงานติดตามไม่สำเร็จ')
      return
    }
    setFollowups((prev) => [data as unknown as FollowUpRow, ...prev])
    setShowForm(false)
    setNote('')
    setCustomerId('')
  }

  const markDone = async (id: string) => {
    setBusy(true)
    const { error: updErr } = await supabase
      .from('sales_followups')
      .update({ status: 'done', updated_at: new Date().toISOString() })
      .eq('id', id)
    setBusy(false)
    if (updErr) {
      setError(updErr.message)
      return
    }
    setFollowups((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'done' } : f)))
    router.refresh()
  }

  const totalOpen = followups.filter((f) => followUpDisplayStatus(f) === 'open').length
  const totalOverdue = followups.filter((f) => followUpDisplayStatus(f) === 'overdue').length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>Follow-up Tasks</h1>
          <p style={{ color: '#6b8f5e', marginBottom: 20 }}>
            รอดำเนินการ {totalOpen} รายการ · เกินกำหนด {totalOverdue} รายการ
          </p>
        </div>
        <button style={primaryButton} onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'ปิดฟอร์ม' : '+ สร้างงานติดตาม'}
        </button>
      </div>

      {error && <p style={{ color: '#c0392b', marginBottom: 12 }}>{error}</p>}

      {showForm && (
        <div style={card}>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <label>
              <span style={fieldLabel}>ลูกค้า *</span>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} style={fieldInput}>
                <option value="">-- เลือกลูกค้า --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name ?? c.shop_name ?? c.customer_code ?? c.id}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span style={fieldLabel}>เซลส์ผู้รับผิดชอบ</span>
              <select value={salesRepId} onChange={(e) => setSalesRepId(e.target.value)} style={fieldInput}>
                <option value="">-- ไม่ระบุ --</option>
                {salesReps.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name ?? s.id}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span style={fieldLabel}>วันครบกำหนด *</span>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={fieldInput} />
            </label>
            <label>
              <span style={fieldLabel}>ประเภทงาน</span>
              <select value={taskType} onChange={(e) => setTaskType(e.target.value as FollowUpTaskType)} style={fieldInput}>
                {TASK_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {FOLLOWUP_TASK_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              <span style={fieldLabel}>บันทึก</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} style={fieldInput} placeholder="รายละเอียดงานติดตาม..." />
            </label>
          </div>
          <button style={{ ...primaryButton, marginTop: 12 }} onClick={createTask} disabled={busy}>
            บันทึก
          </button>
        </div>
      )}

      <div style={{ ...card, padding: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {(['', 'open', 'overdue', 'done'] as const).map((s) => (
          <button
            key={s || 'all'}
            style={{ ...secondaryButton, background: statusFilter === s ? '#2d7a3a' : '#eef2ea', color: statusFilter === s ? '#fff' : '#2d4a3a' }}
            onClick={() => setStatusFilter(s)}
          >
            {s ? FOLLOWUP_STATUS_LABELS[s] : 'ทั้งหมด'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: '#999' }}>ไม่พบงานติดตาม</p>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f7f2', textAlign: 'left' }}>
                <th style={th}>วันครบกำหนด</th>
                <th style={th}>ลูกค้า</th>
                <th style={th}>ประเภท</th>
                <th style={th}>บันทึก</th>
                <th style={th}>เซลส์</th>
                <th style={th}>สถานะ</th>
                <th style={th} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => {
                const displayStatus = followUpDisplayStatus(f)
                return (
                  <tr key={f.id} style={{ borderTop: '1px solid #eee' }}>
                    <td style={td}>{f.due_date}</td>
                    <td style={td}>{customerLabel(f.customers)}</td>
                    <td style={td}>{FOLLOWUP_TASK_TYPE_LABELS[f.task_type]}</td>
                    <td style={td}>{f.note ?? '-'}</td>
                    <td style={td}>{salesRepName(f.sales_rep_id)}</td>
                    <td style={td}>
                      <span style={{ ...badge, background: STATUS_COLORS[displayStatus].bg, color: STATUS_COLORS[displayStatus].fg }}>
                        {FOLLOWUP_STATUS_LABELS[displayStatus]}
                      </span>
                    </td>
                    <td style={td}>
                      {f.status === 'open' && (
                        <button style={secondaryButton} onClick={() => markDone(f.id)} disabled={busy}>
                          ✓ เสร็จสิ้น
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
