import { createClient } from '@/lib/supabase/server'
import SalesRepsManager, { type SalesRep, type RepStat } from './SalesRepsManager'

export default async function SalesRepsPage() {
  const supabase = await createClient()

  const { data: reps } = await supabase
    .from('sales_reps')
    .select('id, full_name, email, phone, user_id, active, created_at')
    .order('full_name')

  const { data: stats } = await supabase
    .from('sales_rep_stats')
    .select('sales_rep_id, customer_count, total_sales_usd, outstanding_usd')

  const statsById: Record<string, RepStat> = {}
  for (const s of stats ?? []) statsById[s.sales_rep_id] = s as RepStat

  return <SalesRepsManager initial={(reps as SalesRep[]) ?? []} stats={statsById} />
}
