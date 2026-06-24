import { createClient } from '@/lib/supabase/server'
import AdminFarmerCreditManager, { type AdminFarmerRow } from './AdminFarmerCreditManager'

export default async function AdminFarmerCreditPage() {
  const supabase = await createClient()

  const { data: farmers } = await supabase
    .from('farmers')
    .select('id, full_name, phone, village, farmer_debts(*)')
    .order('full_name')

  return <AdminFarmerCreditManager initialFarmers={(farmers ?? []) as unknown as AdminFarmerRow[]} />
}
