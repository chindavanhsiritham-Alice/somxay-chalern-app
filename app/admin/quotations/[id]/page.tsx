import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getSalesReps } from '@/lib/crm/data'
import { getTierPrices } from '@/lib/sales/data'
import QuotationDetailManager from './QuotationDetailManager'
import type { Customer } from '@/lib/crm/types'
import type { Quotation, QuotationItem } from '@/lib/sales/types'
import type { Product } from '@/app/admin/products/ProductsManager'

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('id, role, full_name').eq('id', user?.id ?? '').maybeSingle()

  const [{ data: quotation }, { data: items }, salesReps, { data: products }, tierPrices] = await Promise.all([
    supabase.from('quotations').select('*, customers(*)').eq('id', id).maybeSingle(),
    supabase.from('quotation_items').select('*').eq('quotation_id', id).order('sort_order'),
    getSalesReps(supabase),
    supabase.from('products_catalog').select('*').eq('archived', false).order('name'),
    getTierPrices(supabase),
  ])

  if (!quotation) notFound()

  return (
    <QuotationDetailManager
      quotation={quotation as unknown as Quotation & { customers: Customer }}
      items={(items ?? []) as QuotationItem[]}
      salesReps={salesReps}
      products={(products ?? []) as Product[]}
      tierPrices={tierPrices}
      currentUserId={profile?.id ?? null}
      currentUserRole={profile?.role ?? null}
    />
  )
}
