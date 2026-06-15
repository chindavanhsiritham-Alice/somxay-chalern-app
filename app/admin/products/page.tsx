import { createClient } from '@/lib/supabase/server'
import { getRates } from '@/lib/exchangeRates'
import ProductsManager, { type Product } from './ProductsManager'

export default async function AdminProducts() {
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('products_catalog')
    .select('*')
    .order('name')
    .order('crop_year', { ascending: false })

  const rates = await getRates(supabase)

  return (
    <ProductsManager
      initialProducts={(products as Product[]) ?? []}
      usdThb={rates.USD_THB.rate}
      usdLak={rates.USD_LAK.rate}
    />
  )
}
