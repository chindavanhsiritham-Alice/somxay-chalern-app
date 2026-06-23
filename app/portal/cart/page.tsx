import { createClient } from '@/lib/supabase/server'
import CartView from './CartView'

export default async function CartPage() {
  const supabase = await createClient()
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

  return <CartView approved={approved} />
}
