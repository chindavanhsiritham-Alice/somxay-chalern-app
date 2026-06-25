import { createClient } from '@/lib/supabase/server'
import { getWarehouses } from '@/lib/warehouse/data'
import type { GreenBeanLot, ParchmentLot } from '@/lib/warehouse/types'
import GreenBeanInventoryManager from './GreenBeanInventoryManager'

export default async function InventoryGreenBeanPage() {
  const supabase = await createClient()

  const [warehouses, { data: lots }, { data: parchmentLots }] = await Promise.all([
    getWarehouses(supabase),
    supabase.from('green_bean_lots').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('parchment_lots').select('*').gt('remaining_kg', 0).order('created_at', { ascending: false }),
  ])

  return (
    <GreenBeanInventoryManager
      initialLots={(lots ?? []) as GreenBeanLot[]}
      warehouses={warehouses}
      parchmentLots={(parchmentLots ?? []) as ParchmentLot[]}
    />
  )
}
