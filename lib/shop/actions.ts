'use server'

import { createClient } from '@/lib/supabase/server'
import { CartItem, cartItemLineTotal } from './types'

export type PlaceOrderInput = {
  customerName: string
  customerPhone: string
  pickupBranch: string
  paymentMethod: string
  note: string
  items: CartItem[]
}

export type PlaceOrderResult = { orderId: string; orderCode: string } | { error: string }

function generateOrderCode() {
  const now = new Date()
  const stamp = now.toISOString().slice(2, 10).replace(/-/g, '')
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return `SC${stamp}${rand}`
}

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  if (!input.customerName.trim() || !input.customerPhone.trim()) {
    return { error: 'กรุณากรอกชื่อและเบอร์โทรศัพท์' }
  }
  if (input.items.length === 0) {
    return { error: 'ตะกร้าสินค้าว่างเปล่า' }
  }

  const subtotal = input.items.reduce((s, i) => s + cartItemLineTotal(i), 0)
  const supabase = await createClient()

  const { data: order, error: orderError } = await supabase
    .from('shop_orders')
    .insert({
      order_code: generateOrderCode(),
      customer_name: input.customerName.trim(),
      customer_phone: input.customerPhone.trim(),
      pickup_branch: input.pickupBranch,
      payment_method: input.paymentMethod,
      note: input.note.trim() || null,
      subtotal,
      total: subtotal,
      status: 'received',
    })
    .select('id, order_code')
    .single()

  if (orderError || !order) {
    return { error: 'ไม่สามารถสร้างคำสั่งซื้อได้ กรุณาลองใหม่' }
  }

  const orderItems = input.items.map((item) => ({
    order_id: order.id,
    product_id: item.productId,
    product_name: item.name,
    size: item.size,
    temperature: item.temperature,
    sweetness: item.sweetness,
    addons: item.addons,
    unit_price: item.unitPrice,
    quantity: item.quantity,
    line_total: cartItemLineTotal(item),
  }))

  const { error: itemsError } = await supabase.from('shop_order_items').insert(orderItems)
  if (itemsError) {
    return { error: 'ไม่สามารถบันทึกรายการสินค้าได้ กรุณาลองใหม่' }
  }

  return { orderId: order.id, orderCode: order.order_code }
}
