import { createClient } from '@/lib/supabase/server'
import ProductBrowser, { type PortalProduct } from './ProductBrowser'

export default async function PortalProductsPage() {
  const supabase = await createClient()

  // Customers may only query the safe portal_products view (no cost/margin).
  const { data: products } = await supabase
    .from('portal_products')
    .select('*')
    .order('name')

  const {
    data: { user },
  } = await supabase.auth.getUser()
  let approved = false
  if (user) {
    const { data: customer } = await supabase
      .from('customers')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle()
    approved = customer?.status === 'approved'
  }

  return <ProductBrowser products={(products as PortalProduct[]) ?? []} approved={approved} />
}
