import { createClient } from '@/lib/supabase/server'
import PaymentReview, { type AdminOrder } from './PaymentReview'

export default async function PaymentsPage() {
  const supabase = await createClient()

  // Lazily release stock from orders whose 5-day payment window has lapsed.
  await supabase.rpc('expire_overdue_orders')

  const { data } = await supabase
    .from('orders')
    .select(
      'id, status, created_at, payment_submitted_at, payment_deadline, payment_slip_url, total_usd, subtotal_thb, subtotal_lak, customers(full_name, company_name, email), order_items(product_name, quantity_kg, line_total_usd)'
    )
    .in('status', ['payment_submitted', 'payment_confirmed', 'preparing', 'ready_for_pickup'])
    .order('created_at', { ascending: false })

  const orders = (data ?? []) as unknown as AdminOrder[]

  // Pre-sign payment slip URLs for display.
  const withSlips = await Promise.all(
    orders.map(async (o) => {
      if (!o.payment_slip_url) return { ...o, slipUrl: null }
      const { data: signed } = await supabase.storage.from('payment_slips').createSignedUrl(o.payment_slip_url, 3600)
      return { ...o, slipUrl: signed?.signedUrl ?? null }
    })
  )

  return <PaymentReview orders={withSlips} />
}
