import { createClient } from '@/lib/supabase/server'
import { getWarehouses } from '@/lib/warehouse/data'
import type { FinishedGoodsStock, GreenBeanLot, PackagingMaterial, RoastingBatch } from '@/lib/warehouse/types'
import RoastedBeanInventoryManager from './RoastedBeanInventoryManager'

export default async function InventoryRoastedBeanPage() {
  const supabase = await createClient()

  const [warehouses, { data: greenBeanLots }, { data: batches }, { data: finishedGoods }, { data: packaging }, { data: roastedMovements }] =
    await Promise.all([
      getWarehouses(supabase),
      supabase.from('green_bean_lots').select('*').gt('available_quantity', 0).order('created_at', { ascending: false }),
      supabase.from('roasting_batches').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('finished_goods_stock').select('*').order('updated_at', { ascending: false }).limit(200),
      supabase.from('packaging_materials').select('*').order('name'),
      supabase.from('inventory_stock_movements').select('warehouse_id, quantity_kg').eq('material_type', 'roasted_bean'),
    ])

  const roastedStockByWarehouse: Record<string, number> = {}
  for (const m of roastedMovements ?? []) {
    const key = m.warehouse_id ?? 'unassigned'
    roastedStockByWarehouse[key] = (roastedStockByWarehouse[key] ?? 0) + Number(m.quantity_kg)
  }

  return (
    <RoastedBeanInventoryManager
      warehouses={warehouses}
      greenBeanLots={(greenBeanLots ?? []) as GreenBeanLot[]}
      initialBatches={(batches ?? []) as RoastingBatch[]}
      initialFinishedGoods={(finishedGoods ?? []) as FinishedGoodsStock[]}
      initialPackaging={(packaging ?? []) as PackagingMaterial[]}
      roastedStockByWarehouse={roastedStockByWarehouse}
    />
  )
}
