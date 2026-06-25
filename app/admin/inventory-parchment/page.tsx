import { createClient } from '@/lib/supabase/server'
import { getWarehouses } from '@/lib/warehouse/data'
import type { ParchmentLot } from '@/lib/warehouse/types'
import ParchmentInventoryManager from './ParchmentInventoryManager'

export default async function InventoryParchmentPage() {
  const supabase = await createClient()

  const [warehouses, { data: lots }] = await Promise.all([
    getWarehouses(supabase),
    supabase.from('parchment_lots').select('*').order('created_at', { ascending: false }).limit(200),
  ])

  return <ParchmentInventoryManager initialLots={(lots ?? []) as ParchmentLot[]} warehouses={warehouses} />
}
