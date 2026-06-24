'use client'

import { useMemo, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import {
  DEBT_CATEGORY_LABELS,
  DEBT_TRANSACTION_LABELS,
  totalOutstandingDebt,
  type DebtCategory,
  type DebtTransactionType,
  type FarmerDebtBalance,
  type FarmerDebtLedgerEntry,
} from '@/lib/farmer/types'

export type AdminFarmerRow = {
  id: string
  full_name: string
  phone: string | null
  village: string | null
  farmer_debts: FarmerDebtBalance[] | FarmerDebtBalance | null
}

function toOne<T>(v: T[] | T | null | undefined): T | null {
  if (v == null) return null
  return Array.isArray(v) ? v[0] ?? null : v
}

function emptyDebt(farmerId: string): FarmerDebtBalance {
  return {
    farmer_id: farmerId,
    balance: 0,
    fertilizer_balance: 0,
    pesticide_balance: 0,
    cash_advance_balance: 0,
    other_balance: 0,
    updated_at: new Date(0).toISOString(),
  }
}

type Row = { farmer: AdminFarmerRow; debt: FarmerDebtBalance }

function toRow(f: AdminFarmerRow): Row {
  return { farmer: f, debt: toOne(f.farmer_debts) ?? emptyDebt(f.id) }
}

const fieldLabel: React.CSSProperties = { fontSize: 11, color: '#6b8f5e', marginBottom: 4, display: 'block' }
const fieldInput: React.CSSProperties = { width: '100%', padding: '6px 8px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }
const primaryButton: React.CSSProperties = { background: '#2d7a3a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }

const CATEGORY_TO_COLUMN: Record<DebtCategory, keyof FarmerDebtBalance> = {
  fertilizer: 'fertilizer_balance',
  pesticide: 'pesticide_balance',
  cash_advance: 'cash_advance_balance',
  other: 'other_balance',
}

export default function AdminFarmerCreditManager({ initialFarmers }: { initialFarmers: AdminFarmerRow[] }) {
  const supabase = createClient()
  const [rows, setRows] = useState<Row[]>(initialFarmers.map(toRow))
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [ledgerByFarmer, setLedgerByFarmer] = useState<Record<string, FarmerDebtLedgerEntry[]>>({})
  const [loadingLedger, setLoadingLedger] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.farmer.full_name.toLowerCase().includes(q) ||
        (r.farmer.phone ?? '').toLowerCase().includes(q) ||
        (r.farmer.village ?? '').toLowerCase().includes(q)
    )
  }, [rows, search])

  const villageTotals = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rows) {
      const village = r.farmer.village || 'ไม่ระบุหมู่บ้าน'
      map.set(village, (map.get(village) ?? 0) + totalOutstandingDebt(r.debt))
    }
    return Array.from(map.entries())
      .filter(([, total]) => total > 0)
      .sort((a, b) => b[1] - a[1])
  }, [rows])

  function updateDebt(farmerId: string, debt: FarmerDebtBalance) {
    setRows((list) => list.map((r) => (r.farmer.id === farmerId ? { ...r, debt } : r)))
  }

  async function toggleExpand(farmerId: string) {
    if (expandedId === farmerId) {
      setExpandedId(null)
      return
    }
    setExpandedId(farmerId)
    if (!ledgerByFarmer[farmerId]) {
      setLoadingLedger(true)
      const { data } = await supabase
        .from('farmer_debt_ledger')
        .select('id, farmer_id, transaction_type, debit, credit, balance_after, note, created_by, created_at')
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false })
        .limit(30)
      setLoadingLedger(false)
      setLedgerByFarmer((m) => ({ ...m, [farmerId]: (data ?? []) as FarmerDebtLedgerEntry[] }))
    }
  }

  function prependLedger(farmerId: string, entry: FarmerDebtLedgerEntry) {
    setLedgerByFarmer((m) => ({ ...m, [farmerId]: [entry, ...(m[farmerId] ?? [])] }))
  }

  return (
    <div>
      <h1 style={{ color: '#2d7a3a', marginBottom: 4 }}>Farmer Credit</h1>
      <p style={{ color: '#6b8f5e', marginBottom: 20 }}>หนี้ค่าปุ๋ย ค่ายา เงินเบิกล่วงหน้า และยอดคงเหลือของเกษตรกร</p>

      {villageTotals.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 14, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 13, color: '#2d4a3a', marginBottom: 8 }}>ยอดหนี้ค้างชำระตามหมู่บ้าน</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {villageTotals.map(([village, total]) => (
              <div key={village} style={{ background: '#f5f7f2', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                <strong>{village}</strong>: {total.toLocaleString()} บาท
              </div>
            ))}
          </div>
        </div>
      )}

      <input
        placeholder="ค้นหาชื่อ, เบอร์โทร หรือหมู่บ้าน..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: 8, fontSize: 13, width: 280, marginBottom: 16 }}
      />

      {filtered.length === 0 ? (
        <p style={{ color: '#999' }}>ไม่พบเกษตรกร</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((row) => (
            <FarmerCard
              key={row.farmer.id}
              row={row}
              expanded={expandedId === row.farmer.id}
              onToggle={() => toggleExpand(row.farmer.id)}
              ledger={ledgerByFarmer[row.farmer.id] ?? []}
              loadingLedger={loadingLedger && expandedId === row.farmer.id}
              onDebtChange={(debt) => updateDebt(row.farmer.id, debt)}
              onLedgerEntry={(entry) => prependLedger(row.farmer.id, entry)}
              supabase={supabase}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FarmerCard({
  row,
  expanded,
  onToggle,
  ledger,
  loadingLedger,
  onDebtChange,
  onLedgerEntry,
  supabase,
}: {
  row: Row
  expanded: boolean
  onToggle: () => void
  ledger: FarmerDebtLedgerEntry[]
  loadingLedger: boolean
  onDebtChange: (debt: FarmerDebtBalance) => void
  onLedgerEntry: (entry: FarmerDebtLedgerEntry) => void
  supabase: SupabaseClient
}) {
  const { farmer, debt } = row
  const total = totalOutstandingDebt(debt)

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={onToggle}>
        <div>
          <div style={{ fontWeight: 700, color: '#2d4a3a' }}>{farmer.full_name}</div>
          <div style={{ fontSize: 12, color: '#6b8f5e' }}>
            {farmer.phone ?? '-'} {farmer.village ? `· ${farmer.village}` : ''}
          </div>
        </div>
        <div style={{ fontWeight: 700, color: total > 0 ? '#9a2a2a' : '#2d7a3a' }}>{total.toLocaleString()} บาท</div>
      </div>

      {expanded && (
        <div style={{ marginTop: 14, borderTop: '1px solid #eee', paddingTop: 14 }}>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', marginBottom: 14 }}>
            {(Object.keys(DEBT_CATEGORY_LABELS) as DebtCategory[]).map((cat) => (
              <div key={cat} style={{ background: '#f5f7f2', borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 11, color: '#6b8f5e' }}>{DEBT_CATEGORY_LABELS[cat]}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#2d4a3a' }}>
                  {Number(debt[CATEGORY_TO_COLUMN[cat]]).toLocaleString()} บาท
                </div>
              </div>
            ))}
          </div>

          <AddTransactionForm farmerId={farmer.id} debt={debt} supabase={supabase} onDebtChange={onDebtChange} onLedgerEntry={onLedgerEntry} />

          <h4 style={{ fontSize: 12, color: '#2d4a3a', margin: '14px 0 8px' }}>ประวัติรายการ</h4>
          {loadingLedger ? (
            <p style={{ fontSize: 12, color: '#999' }}>กำลังโหลด...</p>
          ) : ledger.length === 0 ? (
            <p style={{ fontSize: 12, color: '#999' }}>ยังไม่มีรายการ</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ledger.map((entry) => (
                <div key={entry.id} style={{ fontSize: 12, color: '#444', borderBottom: '1px solid #f0f0f0', paddingBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{DEBT_TRANSACTION_LABELS[entry.transaction_type]}</span>
                    <span style={{ fontWeight: 600 }}>
                      {entry.debit > 0 ? `+${entry.debit.toLocaleString()}` : entry.credit > 0 ? `-${entry.credit.toLocaleString()}` : '-'} บาท
                    </span>
                  </div>
                  {entry.note && <div style={{ color: '#888' }}>{entry.note}</div>}
                  <div style={{ color: '#aaa' }}>{new Date(entry.created_at).toLocaleString('th-TH')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const TX_TYPES: { value: DebtTransactionType; label: string }[] = [
  { value: 'fertilizer', label: DEBT_TRANSACTION_LABELS.fertilizer },
  { value: 'pesticide', label: DEBT_TRANSACTION_LABELS.pesticide },
  { value: 'cash_advance', label: DEBT_TRANSACTION_LABELS.cash_advance },
  { value: 'adjustment', label: DEBT_TRANSACTION_LABELS.adjustment },
]

const TX_TO_CATEGORY: Partial<Record<DebtTransactionType, DebtCategory>> = {
  fertilizer: 'fertilizer',
  pesticide: 'pesticide',
  cash_advance: 'cash_advance',
}

function AddTransactionForm({
  farmerId,
  debt,
  supabase,
  onDebtChange,
  onLedgerEntry,
}: {
  farmerId: string
  debt: FarmerDebtBalance
  supabase: SupabaseClient
  onDebtChange: (debt: FarmerDebtBalance) => void
  onLedgerEntry: (entry: FarmerDebtLedgerEntry) => void
}) {
  const [txType, setTxType] = useState<DebtTransactionType>('fertilizer')
  const [category, setCategory] = useState<DebtCategory>('other')
  const [direction, setDirection] = useState<'debit' | 'credit'>('debit')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const effectiveCategory: DebtCategory = TX_TO_CATEGORY[txType] ?? category

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('กรุณากรอกจำนวนเงินให้ถูกต้อง')
      return
    }
    setSaving(true)

    const { data: userData } = await supabase.auth.getUser()
    const column = CATEGORY_TO_COLUMN[effectiveCategory]
    const currentValue = Number(debt[column])
    const newValue = Math.max(0, currentValue + (direction === 'debit' ? amt : -amt))

    const nextDebt: FarmerDebtBalance = { ...debt, [column]: newValue, updated_at: new Date().toISOString() }
    if (effectiveCategory === 'fertilizer') nextDebt.balance = newValue

    const upsertPayload: Record<string, unknown> = {
      farmer_id: farmerId,
      [column]: newValue,
      updated_at: nextDebt.updated_at,
    }
    if (effectiveCategory === 'fertilizer') upsertPayload.balance = newValue

    const { error: upsertError } = await supabase.from('farmer_debts').upsert(upsertPayload, { onConflict: 'farmer_id' })
    if (upsertError) {
      setSaving(false)
      setError('ไม่สามารถบันทึกยอดหนี้ได้')
      return
    }

    const totalAfter = totalOutstandingDebt(nextDebt)
    const { data: ledgerRow, error: ledgerError } = await supabase
      .from('farmer_debt_ledger')
      .insert({
        farmer_id: farmerId,
        transaction_type: txType,
        debit: direction === 'debit' ? amt : 0,
        credit: direction === 'credit' ? amt : 0,
        balance_after: totalAfter,
        note: note || null,
        created_by: userData.user?.id ?? null,
      })
      .select()
      .single()

    setSaving(false)
    if (ledgerError || !ledgerRow) {
      setError('บันทึกยอดหนี้แล้ว แต่ไม่สามารถบันทึกประวัติได้')
      onDebtChange(nextDebt)
      return
    }

    onDebtChange(nextDebt)
    onLedgerEntry(ledgerRow as FarmerDebtLedgerEntry)
    setAmount('')
    setNote('')
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: '#fbfdf9', border: '1px solid #e6e0d2', borderRadius: 10, padding: 12 }}>
      <h4 style={{ fontSize: 12, color: '#2d4a3a', marginBottom: 8 }}>เพิ่มรายการหนี้ / ปรับปรุงยอด</h4>
      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', marginBottom: 8 }}>
        <label>
          <span style={fieldLabel}>ประเภท</span>
          <select value={txType} onChange={(e) => setTxType(e.target.value as DebtTransactionType)} style={fieldInput}>
            {TX_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        {txType === 'adjustment' && (
          <label>
            <span style={fieldLabel}>หมวดหนี้</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as DebtCategory)} style={fieldInput}>
              {(Object.keys(DEBT_CATEGORY_LABELS) as DebtCategory[]).map((c) => (
                <option key={c} value={c}>
                  {DEBT_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span style={fieldLabel}>ทิศทาง</span>
          <select value={direction} onChange={(e) => setDirection(e.target.value as 'debit' | 'credit')} style={fieldInput}>
            <option value="debit">เพิ่มหนี้</option>
            <option value="credit">ลดหนี้</option>
          </select>
        </label>
        <label>
          <span style={fieldLabel}>จำนวนเงิน (บาท)</span>
          <input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} style={fieldInput} />
        </label>
        <label>
          <span style={fieldLabel}>หมายเหตุ</span>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} style={fieldInput} />
        </label>
      </div>
      {error && <p style={{ color: '#c0392b', fontSize: 12, marginBottom: 8 }}>{error}</p>}
      <button type="submit" disabled={saving} style={primaryButton}>
        {saving ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
      </button>
    </form>
  )
}
