import { createClient } from '@/lib/supabase/server'
import { getSalesReps } from '@/lib/crm/data'
import type { Customer } from '@/lib/crm/types'
import SalesPipelineManager from './SalesPipelineManager'

const PIPELINE_FIELDS =
  'id, customer_code, company_name, shop_name, owner_name, phone, province, category, tags, pipeline_stage, assigned_sales_rep, status, updated_at'

export default async function AdminSalesPipelinePage() {
  const supabase = await createClient()

  const [salesReps, { data: customers }] = await Promise.all([
    getSalesReps(supabase),
    supabase
      .from('customers')
      .select(PIPELINE_FIELDS)
      .order('updated_at', { ascending: false })
      .limit(500),
  ])

  return <SalesPipelineManager initialCustomers={(customers ?? []) as Customer[]} salesReps={salesReps} />
}
