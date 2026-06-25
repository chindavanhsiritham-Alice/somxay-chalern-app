import { createClient } from '@/lib/supabase/server'
import { getSalesReps } from '@/lib/crm/data'
import { getTierPrices } from '@/lib/sales/data'
import NewQuotationForm from './NewQuotationForm'
import type { Customer } from '@/lib/crm/types'
import type { Product } from '@/app/admin/products/ProductsManager'

export default async function NewQuotationPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('id, role, full_name').eq('id', user?.id ?? '').maybeSingle()

  let customerQuery = supabase
    .from('customers')
    .select('id, customer_code, company_name, shop_name, owner_name, phone, whatsapp, email, tier, assigned_sales_rep, status')
    .eq('status', 'active')
    .order('company_name')

  if (profile?.role === 'sales') {
    customerQuery = customerQuery.eq('assigned_sales_rep', profile.id)
  }

  const [{ data: customers }, salesReps, { data: products }, tierPrices] = await Promise.all([
    customerQuery,
    getSalesReps(supabase),
    supabase.from('products_catalog').select('*').eq('archived', false).order('name'),
    getTierPrices(supabase),
  ])

  return (
    <NewQuotationForm
      customers={
        (customers ?? []) as unknown as Pick<
          Customer,
          'id' | 'customer_code' | 'company_name' | 'shop_name' | 'owner_name' | 'phone' | 'whatsapp' | 'email' | 'tier' | 'assigned_sales_rep' | 'status'
        >[]
      }
      salesReps={salesReps}
      products={(products ?? []) as Product[]}
      tierPrices={tierPrices}
      currentUserId={profile?.id ?? null}
      currentUserRole={profile?.role ?? null}
    />
  )
}
