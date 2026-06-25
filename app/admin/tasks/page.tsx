import { createClient } from '@/lib/supabase/server'
import { getSalesReps } from '@/lib/crm/data'
import FollowUpTasksManager from './FollowUpTasksManager'
import type { SalesFollowUp } from '@/lib/sales/types'
import type { Customer } from '@/lib/crm/types'

export type FollowUpRow = SalesFollowUp & {
  customers: Pick<Customer, 'customer_code' | 'company_name' | 'shop_name'> | null
}

export default async function AdminTasksPage() {
  const supabase = await createClient()

  const [{ data: followups }, salesReps, { data: customers }] = await Promise.all([
    supabase
      .from('sales_followups')
      .select('*, customers(customer_code, company_name, shop_name)')
      .order('due_date', { ascending: true }),
    getSalesReps(supabase),
    supabase.from('customers').select('id, customer_code, company_name, shop_name').order('company_name'),
  ])

  return (
    <FollowUpTasksManager
      initialFollowUps={(followups ?? []) as unknown as FollowUpRow[]}
      salesReps={salesReps}
      customers={(customers ?? []) as Pick<Customer, 'id' | 'customer_code' | 'company_name' | 'shop_name'>[]}
    />
  )
}
