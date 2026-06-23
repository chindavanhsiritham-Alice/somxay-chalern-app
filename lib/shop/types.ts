export type ShopCategory = {
  id: string
  name: string
  sort_order: number
}

export type ShopProduct = {
  id: string
  category_id: string | null
  name: string
  description: string | null
  image_emoji: string
  base_price: number
  large_upcharge: number
  hot_available: boolean
  iced_available: boolean
  is_available: boolean
  sort_order: number
}

export type ShopAddon = {
  id: string
  name: string
  price: number
  sort_order: number
}

export type CartAddon = { name: string; price: number }

export type CartItem = {
  key: string
  productId: string
  name: string
  emoji: string
  unitPrice: number
  size: 'normal' | 'large'
  temperature: 'hot' | 'iced'
  sweetness: string
  addons: CartAddon[]
  quantity: number
}

export const SWEETNESS_LEVELS = ['หวานปกติ', 'หวานน้อย', 'ไม่หวาน'] as const

export function cartItemKey(
  productId: string,
  size: string,
  temperature: string,
  sweetness: string,
  addons: CartAddon[]
) {
  const addonKey = addons.map((a) => a.name).sort().join(',')
  return [productId, size, temperature, sweetness, addonKey].join('|')
}

export function cartItemLineTotal(item: CartItem) {
  const addonsTotal = item.addons.reduce((s, a) => s + a.price, 0)
  return (item.unitPrice + addonsTotal) * item.quantity
}
