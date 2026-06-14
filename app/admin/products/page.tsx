import { createClient } from '@/lib/supabase/server'
import ProductsManager, { type Product } from './ProductsManager'

export default async function AdminProducts() {
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('products_catalog')
    .select('*')
    .order('name')

  return <ProductsManager initialProducts={(products as Product[]) ?? []} />
}
