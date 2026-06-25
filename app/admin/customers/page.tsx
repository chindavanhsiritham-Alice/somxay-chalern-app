import { createClient } from '@/lib/supabase/server'
import { getSalesReps, CUSTOMERS_PAGE_SIZE } from '@/lib/crm/data'
import type { Customer } from '@/lib/crm/types'
import CustomersListManager from './CustomersListManager'

export default async function AdminCustomersPage() {
  const supabase = await createClient()

  const [salesReps, { data: customers, count }] = await Promise.all([
    getSalesReps(supabase),
    supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(0, CUSTOMERS_PAGE_SIZE - 1),
  ])

  return (
    <CustomersListManager
      initialCustomers={(customers ?? []) as Customer[]}
      initialCount={count ?? 0}
      salesReps={salesReps}
    />
  )
}
