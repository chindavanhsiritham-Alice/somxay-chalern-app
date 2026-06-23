import { createClient } from '@/lib/supabase/server'
import { ShopAddon, ShopCategory, ShopProduct } from '@/lib/shop/types'
import ShopMenu from './ShopMenu'

export default async function ShopPage() {
  const supabase = await createClient()

  const [{ data: categories }, { data: products }, { data: addons }] = await Promise.all([
    supabase.from('shop_categories').select('id, name, sort_order').order('sort_order'),
    supabase
      .from('shop_products')
      .select('id, category_id, name, description, image_emoji, base_price, large_upcharge, hot_available, iced_available, is_available, sort_order')
      .eq('is_available', true)
      .order('sort_order'),
    supabase.from('shop_addons').select('id, name, price, sort_order').order('sort_order'),
  ])

  return (
    <ShopMenu
      categories={(categories as ShopCategory[]) ?? []}
      products={(products as ShopProduct[]) ?? []}
      addons={(addons as ShopAddon[]) ?? []}
    />
  )
}
