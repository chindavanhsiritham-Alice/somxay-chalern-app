import { createClient } from '@/lib/supabase/server'
import { getSalesReps } from '@/lib/crm/data'
import { QUOTATIONS_PAGE_SIZE } from '@/lib/sales/data'
import QuotationsListManager from './QuotationsListManager'
import type { Quotation } from '@/lib/sales/types'

export type QuotationRow = Quotation & {
  customers: { customer_code: string | null; company_name: string | null; shop_name: string | null } | null
}

export default async function AdminQuotationsPage() {
  const supabase = await createClient()

  const [{ data: quotations, count }, salesReps] = await Promise.all([
    supabase
      .from('quotations')
      .select('*, customers(customer_code, company_name, shop_name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(0, QUOTATIONS_PAGE_SIZE - 1),
    getSalesReps(supabase),
  ])

  return (
    <QuotationsListManager
      initialQuotations={(quotations ?? []) as unknown as QuotationRow[]}
      initialCount={count ?? 0}
      salesReps={salesReps}
    />
  )
}
