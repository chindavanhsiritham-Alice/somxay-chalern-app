import { createClient } from '@/lib/supabase/server'
import CustomersManager, { type ManagedCustomer, type Balance, type RepOption } from './CustomersManager'

const PAGE_SIZE = 25

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; tier?: string; rep?: string; page?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()

  const page = Math.max(1, Number(sp.page) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const q = (sp.q ?? '').trim()

  let query = supabase
    .from('customers')
    .select(
      'id, customer_code, full_name, company_name, email, phone, country, province_city, customer_type, status, tier, payment_terms, credit_limit_usd, sales_rep_id',
      { count: 'exact' }
    )

  if (sp.status) query = query.eq('status', sp.status)
  if (sp.tier) query = query.eq('tier', sp.tier)
  if (sp.rep) query = query.eq('sales_rep_id', sp.rep)
  if (q) {
    // Sanitize for the PostgREST or() grammar.
    const safe = q.replace(/[,()%*]/g, ' ').trim()
    if (safe) {
      query = query.or(
        `full_name.ilike.%${safe}%,company_name.ilike.%${safe}%,email.ilike.%${safe}%,customer_code.ilike.%${safe}%`
      )
    }
  }

  const { data, count } = await query.order('created_at', { ascending: false }).range(from, to)
  const customers = (data as ManagedCustomer[]) ?? []

  const ids = customers.map((c) => c.id)
  const balancesById: Record<string, Balance> = {}
  if (ids.length > 0) {
    const { data: balances } = await supabase
      .from('customer_balances')
      .select('customer_id, credit_limit_usd, outstanding_usd, available_usd')
      .in('customer_id', ids)
    for (const b of balances ?? []) balancesById[b.customer_id] = b as Balance
  }

  const { data: reps } = await supabase
    .from('sales_reps')
    .select('id, full_name')
    .eq('active', true)
    .order('full_name')

  return (
    <CustomersManager
      customers={customers}
      total={count ?? 0}
      page={page}
      pageSize={PAGE_SIZE}
      filters={{ q: sp.q ?? '', status: sp.status ?? '', tier: sp.tier ?? '', rep: sp.rep ?? '' }}
      reps={(reps as RepOption[]) ?? []}
      balances={balancesById}
    />
  )
}
