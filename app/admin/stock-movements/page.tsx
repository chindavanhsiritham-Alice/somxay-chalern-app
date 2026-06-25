import { createClient } from '@/lib/supabase/server'
import { getWarehouses } from '@/lib/warehouse/data'
import type { StockMovement } from '@/lib/warehouse/types'
import StockMovementsManager from './StockMovementsManager'

export default async function StockMovementsPage() {
  const supabase = await createClient()

  const [warehouses, { data: movements }] = await Promise.all([
    getWarehouses(supabase),
    supabase
      .from('inventory_stock_movements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300),
  ])

  return <StockMovementsManager warehouses={warehouses} initialMovements={(movements ?? []) as StockMovement[]} />
}
