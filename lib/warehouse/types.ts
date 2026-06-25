export type MaterialType = 'cherry' | 'parchment' | 'green_bean' | 'roasted_bean' | 'packaging' | 'finished_goods'

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  cherry: 'เชอร์รี่',
  parchment: 'กะลา (พาร์ชเมนต์)',
  green_bean: 'สารกาแฟ (กรีนบีน)',
  roasted_bean: 'กาแฟคั่ว',
  packaging: 'วัสดุบรรจุภัณฑ์',
  finished_goods: 'สินค้าสำเร็จรูป',
}

export type MovementType = 'receive' | 'transfer' | 'process' | 'adjust' | 'export' | 'sale'

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  receive: 'รับเข้า',
  transfer: 'โอนย้าย',
  process: 'แปรรูป',
  adjust: 'ปรับปรุงยอด',
  export: 'ส่งออก',
  sale: 'ขาย',
}

export type Warehouse = {
  id: string
  name: string
  location: string | null
  created_at: string
}

export type ParchmentLot = {
  id: string
  lot_code: string
  source_cherry_kg: number
  parchment_kg: number
  remaining_kg: number
  yield_percent: number
  process: string | null
  warehouse_id: string | null
  note: string | null
  created_by: string | null
  created_at: string
}

export type GreenBeanLot = {
  id: string
  lot_number: string
  variety: string | null
  process: string | null
  grade: string | null
  warehouse_id: string | null
  source_parchment_lot_id: string | null
  stock_quantity: number
  reserved_quantity: number
  available_quantity: number
  unit_cost: number | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type RoastingBatch = {
  id: string
  batch_code: string
  green_bean_lot_id: string | null
  green_bean_kg_used: number
  roasted_kg_output: number
  roast_level: string | null
  warehouse_id: string | null
  created_by: string | null
  created_at: string
}

export type FinishedGoodsStock = {
  id: string
  product_name: string
  package_size: string | null
  warehouse_id: string | null
  roasting_batch_id: string | null
  stock_quantity: number
  unit_cost: number | null
  created_at: string
  updated_at: string
}

export type PackagingMaterial = {
  id: string
  name: string
  unit: string
  warehouse_id: string | null
  stock_quantity: number
  reorder_threshold: number
  created_at: string
  updated_at: string
}

export type StockMovement = {
  id: string
  material_type: MaterialType
  movement_type: MovementType
  reference_label: string | null
  reference_id: string | null
  warehouse_id: string | null
  related_warehouse_id: string | null
  quantity_kg: number
  unit_cost: number | null
  note: string | null
  created_by: string | null
  created_at: string
}

export type InventoryThreshold = {
  material_type: MaterialType
  threshold_kg: number
}

export function generateLotCode(prefix: string) {
  const now = new Date()
  const stamp = now.toISOString().slice(2, 10).replace(/-/g, '')
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return `${prefix}${stamp}${rand}`
}

export function roastYieldPercent(greenBeanKgUsed: number, roastedKgOutput: number) {
  if (greenBeanKgUsed <= 0) return 0
  return (roastedKgOutput / greenBeanKgUsed) * 100
}
