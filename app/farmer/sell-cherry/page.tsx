import { createClient } from '@/lib/supabase/server'
import { getOrCreateFarmer } from '@/lib/farmer/farmer'
import { getCherryPrices } from '@/lib/farmer/prices'
import { getActiveDeliverySlots } from '@/lib/farmer/slots'
import SellCherryForm from './SellCherryForm'

export default async function SellCherryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user!.id).maybeSingle()
  const farmer = await getOrCreateFarmer(supabase, user!.id, profile?.full_name ?? 'เกษตรกร')
  const prices = await getCherryPrices(supabase)
  const slots = await getActiveDeliverySlots(supabase)

  return <SellCherryForm farmerId={farmer.id} prices={prices} slots={slots} />
}
