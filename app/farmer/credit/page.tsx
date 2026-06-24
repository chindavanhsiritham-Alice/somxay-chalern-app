import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateFarmer, getFarmerDebtBalance } from '@/lib/farmer/farmer'
import { farmerTheme } from '@/lib/farmer/theme'
import {
  DEBT_CATEGORY_LABELS,
  DEBT_TRANSACTION_LABELS,
  totalOutstandingDebt,
  type DebtCategory,
  type FarmerDebtLedgerEntry,
} from '@/lib/farmer/types'

export default async function FarmerCreditPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user!.id).maybeSingle()
  const farmer = await getOrCreateFarmer(supabase, user!.id, profile?.full_name ?? 'เกษตรกร')
  const debt = await getFarmerDebtBalance(supabase, farmer.id)

  const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString()

  const [{ data: ledger }, { data: paymentsThisYear }] = await Promise.all([
    supabase
      .from('farmer_debt_ledger')
      .select('id, farmer_id, transaction_type, debit, credit, balance_after, note, created_by, created_at')
      .eq('farmer_id', farmer.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('farmer_payments')
      .select('gross_amount, net_payable, status, created_at')
      .eq('farmer_id', farmer.id)
      .gte('created_at', startOfYear),
  ])

  const totalDebt = totalOutstandingDebt(debt)
  const totalSalesThisYear = (paymentsThisYear ?? []).reduce((sum, p) => sum + Number(p.gross_amount), 0)
  const totalPaidThisYear = (paymentsThisYear ?? [])
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.net_payable), 0)
  const netBalance = totalSalesThisYear - totalPaidThisYear

  const categories: { key: DebtCategory; value: number }[] = [
    { key: 'fertilizer', value: debt.fertilizer_balance },
    { key: 'pesticide', value: debt.pesticide_balance },
    { key: 'cash_advance', value: debt.cash_advance_balance },
    { key: 'other', value: debt.other_balance },
  ]

  return (
    <div>
      <h1 style={{ color: farmerTheme.greenDark, fontSize: 20, marginBottom: 4 }}>หนี้และเครดิตของฉัน</h1>
      <p style={{ color: farmerTheme.muted, fontSize: 13, marginBottom: 18 }}>ยอดหนี้ค้างชำระ การหักจากการขายเชอร์รี่ และประวัติการจ่ายเงิน</p>

      <Card highlight>
        <div style={{ fontSize: 12, color: farmerTheme.muted, marginBottom: 4 }}>ยอดหนี้ค้างชำระทั้งหมด</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: totalDebt > 0 ? '#9a2a2a' : farmerTheme.green }}>
          {totalDebt.toLocaleString()} บาท
        </div>
      </Card>

      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr', margin: '14px 0 18px' }}>
        {categories.map((c) => (
          <Card key={c.key}>
            <div style={{ fontSize: 11, color: farmerTheme.muted, marginBottom: 4 }}>{DEBT_CATEGORY_LABELS[c.key]}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: c.value > 0 ? '#9a2a2a' : farmerTheme.green }}>
              {c.value.toLocaleString()} บาท
            </div>
          </Card>
        ))}
      </div>

      <Section title="สรุปยอดปีนี้">
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr 1fr' }}>
          <Card>
            <div style={{ fontSize: 11, color: farmerTheme.muted, marginBottom: 4 }}>ขายเชอร์รี่ปีนี้</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: farmerTheme.green }}>{totalSalesThisYear.toLocaleString()}</div>
          </Card>
          <Card>
            <div style={{ fontSize: 11, color: farmerTheme.muted, marginBottom: 4 }}>จ่ายแล้วปีนี้</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: farmerTheme.green }}>{totalPaidThisYear.toLocaleString()}</div>
          </Card>
          <Card>
            <div style={{ fontSize: 11, color: farmerTheme.muted, marginBottom: 4 }}>ยอดคงเหลือ</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: netBalance > 0 ? '#8a5a00' : farmerTheme.green }}>{netBalance.toLocaleString()}</div>
          </Card>
        </div>
        <Link href="/farmer/year-summary" style={{ display: 'inline-block', marginTop: 10, fontSize: 12, color: farmerTheme.green }}>
          ดูสรุปรายปีทั้งหมด →
        </Link>
      </Section>

      <Section title="ประวัติการหักหนี้และการจ่ายเงิน">
        {!ledger || ledger.length === 0 ? (
          <p style={{ color: farmerTheme.muted, fontSize: 13 }}>ยังไม่มีรายการ</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(ledger as FarmerDebtLedgerEntry[]).map((entry) => (
              <Card key={entry.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 13 }}>
                  <span>{DEBT_TRANSACTION_LABELS[entry.transaction_type]}</span>
                  <span style={{ color: entry.credit > 0 ? '#256029' : entry.debit > 0 ? '#9a2a2a' : farmerTheme.muted }}>
                    {entry.credit > 0 ? `-${entry.credit.toLocaleString()}` : entry.debit > 0 ? `+${entry.debit.toLocaleString()}` : '-'} บาท
                  </span>
                </div>
                {entry.note && <div style={{ fontSize: 12, color: farmerTheme.muted, marginTop: 2 }}>{entry.note}</div>}
                <div style={{ fontSize: 11, color: farmerTheme.muted, marginTop: 4 }}>
                  {new Date(entry.created_at).toLocaleDateString('th-TH')} · ยอดหนี้คงเหลือ {entry.balance_after.toLocaleString()} บาท
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h2 style={{ fontSize: 14, color: farmerTheme.greenDark, marginBottom: 8 }}>{title}</h2>
      {children}
    </div>
  )
}

function Card({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <div
      style={{
        background: farmerTheme.card,
        border: `1px solid ${farmerTheme.border}`,
        borderRadius: 12,
        padding: 14,
        ...(highlight ? { borderColor: farmerTheme.green } : {}),
      }}
    >
      {children}
    </div>
  )
}
