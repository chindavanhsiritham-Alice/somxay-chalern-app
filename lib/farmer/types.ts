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
  net_payable: number
  payment_method: string | null
  payment_slip_url: string | null
  status: PaymentStatus
  paid_at: string | null
  created_at: string
}

export function generateBookingCode() {
  const now = new Date()
  const stamp = now.toISOString().slice(2, 10).replace(/-/g, '')
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return `CB${stamp}${rand}`
}
