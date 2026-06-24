export const COFFEE_TYPES = ['Arabica Cherry', 'Robusta Cherry'] as const
export type CoffeeType = (typeof COFFEE_TYPES)[number]

export const QUANTITY_UNITS = ['kg', 'ton'] as const
export type QuantityUnit = (typeof QUANTITY_UNITS)[number]

export const DELIVERY_POINTS = ['Factory', 'Buying Station'] as const
export type DeliveryPoint = (typeof DELIVERY_POINTS)[number]

export type BookingStatus = 'pending' | 'confirmed' | 'received' | 'cancelled'

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'รอดำเนินการ',
  confirmed: 'ยืนยันแล้ว',
  received: 'รับซื้อแล้ว',
  cancelled: 'ยกเลิก',
}

export type PaymentStatus = 'pending' | 'paid'

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'รอจ่ายเงิน',
  paid: 'จ่ายแล้ว',
}

export type Farmer = {
  id: string
  profile_id: string
  full_name: string
  phone: string | null
  village: string | null
}

export type ArrivalStatus = 'waiting' | 'arrived' | 'weighing' | 'quality_check' | 'completed'

export const ARRIVAL_STATUS_ORDER: ArrivalStatus[] = ['waiting', 'arrived', 'weighing', 'quality_check', 'completed']

export const ARRIVAL_STATUS_LABELS: Record<ArrivalStatus, string> = {
  waiting: 'รอเข้าคิว',
  arrived: 'มาถึงแล้ว',
  weighing: 'กำลังชั่งน้ำหนัก',
  quality_check: 'กำลังตรวจคุณภาพ',
  completed: 'เสร็จสิ้น',
}

export type DeliverySlot = {
  id: string
  start_time: string
  end_time: string
  capacity_kg: number
  active: boolean
  created_at: string
}

export type SlotAvailability = {
  slot_id: string
  start_time: string
  end_time: string
  capacity_kg: number
  booked_kg: number
  remaining_kg: number
}

export type CherryBooking = {
  id: string
  booking_code: string
  farmer_id: string
  coffee_type: string
  estimated_quantity: number
  quantity_unit: string
  delivery_date: string
  delivery_time: string
  delivery_point: string
  photo_url: string | null
  price_at_booking: number
  status: BookingStatus
  slot_id: string | null
  queue_number: string | null
  arrival_status: ArrivalStatus
  arrived_at: string | null
  weighing_started_at: string | null
  quality_check_started_at: string | null
  completed_at: string | null
  created_at: string
}

export type CherryReceiving = {
  id: string
  booking_id: string
  truck_plate: string | null
  gross_weight: number | null
  tare_weight: number | null
  net_weight: number | null
  quality_grade: string | null
  defect_percent: number | null
  deduction_percent: number | null
  accepted_weight: number | null
  received_at: string | null
}

export type FarmerPayment = {
  id: string
  booking_id: string | null
  farmer_id: string
  accepted_weight: number
  price_per_kg: number
  gross_amount: number
  fertilizer_deduction: number
  pesticide_deduction: number
  cash_advance_deduction: number
  net_payable: number
  payment_method: string | null
  payment_slip_url: string | null
  status: PaymentStatus
  paid_at: string | null
  created_at: string
}

export type DebtTransactionType =
  | 'fertilizer'
  | 'pesticide'
  | 'cash_advance'
  | 'cherry_sale'
  | 'payment'
  | 'deduction'
  | 'adjustment'

export const DEBT_TRANSACTION_LABELS: Record<DebtTransactionType, string> = {
  fertilizer: 'เพิ่มหนี้ค่าปุ๋ย',
  pesticide: 'เพิ่มหนี้ค่ายา/สารเคมี',
  cash_advance: 'เบิกเงินล่วงหน้า',
  cherry_sale: 'ขายเชอร์รี่',
  payment: 'จ่ายเงิน',
  deduction: 'หักหนี้จากการขายเชอร์รี่',
  adjustment: 'ปรับปรุงยอด',
}

export type DebtCategory = 'fertilizer' | 'pesticide' | 'cash_advance' | 'other'

export const DEBT_CATEGORY_LABELS: Record<DebtCategory, string> = {
  fertilizer: 'หนี้ค่าปุ๋ย',
  pesticide: 'หนี้ค่ายา/สารเคมี',
  cash_advance: 'เงินเบิกล่วงหน้า',
  other: 'หนี้อื่นๆ',
}

export type FarmerDebtBalance = {
  farmer_id: string
  balance: number
  fertilizer_balance: number
  pesticide_balance: number
  cash_advance_balance: number
  other_balance: number
  updated_at: string
}

export type FarmerDebtLedgerEntry = {
  id: string
  farmer_id: string
  transaction_type: DebtTransactionType
  debit: number
  credit: number
  balance_after: number
  note: string | null
  created_by: string | null
  created_at: string
}

export function totalOutstandingDebt(debt: FarmerDebtBalance) {
  return debt.fertilizer_balance + debt.pesticide_balance + debt.cash_advance_balance + debt.other_balance
}

export function generateBookingCode() {
  const now = new Date()
  const stamp = now.toISOString().slice(2, 10).replace(/-/g, '')
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return `CB${stamp}${rand}`
}

export function toKg(quantity: number, unit: string) {
  return unit === 'ton' ? quantity * 1000 : quantity
}

export function generateQueueNumber(year: number, sequence: number) {
  return `Q-${year}-${String(sequence).padStart(4, '0')}`
}
