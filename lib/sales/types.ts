export type QuotationCurrency = 'USD' | 'THB' | 'LAK'

export const QUOTATION_CURRENCIES: QuotationCurrency[] = ['USD', 'THB', 'LAK']

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted'

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  draft: 'แบบร่าง',
  sent: 'ส่งแล้ว',
  accepted: 'ลูกค้ายอมรับ',
  rejected: 'ถูกปฏิเสธ',
  expired: 'หมดอายุ',
  converted: 'แปลงเป็นออเดอร์แล้ว',
}

export type ApprovalStatus = 'not_required' | 'pending_approval' | 'approved' | 'rejected'

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  not_required: 'ไม่ต้องอนุมัติ',
  pending_approval: 'รออนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ถูกปฏิเสธ',
}

export const APPROVAL_DISCOUNT_THRESHOLD_PERCENT = 5

export type Quotation = {
  id: string
  quotation_number: string
  customer_id: string
  sales_rep_id: string | null
  quotation_date: string
  expiry_date: string | null
  currency: QuotationCurrency
  status: QuotationStatus
  approval_status: ApprovalStatus
  subtotal: number
  discount_total: number
  total: number
  freight: number
  insurance: number
  tax_total: number
  notes: string | null
  terms: string | null
  rejected_reason: string | null
  approved_by: string | null
  approved_at: string | null
  converted_order_id: string | null
  converted_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type QuotationItem = {
  id: string
  quotation_id: string
  product_id: string | number | null
  product_name: string | null
  kg: number
  unit_price: number
  tier_price: number | null
  discount_percent: number
  discount_amount: number
  tax_percent: number
  tax_amount: number
  requires_approval: boolean
  total: number
  sort_order: number
  created_at: string
}

export type ProductTierPrice = {
  id: string
  product_id: string | number
  tier: string
  price_usd: number | null
  price_thb: number | null
  price_lak: number | null
  created_at: string
  updated_at: string
}

export type FollowUpTaskType =
  | 'phone_call'
  | 'whatsapp'
  | 'email'
  | 'meeting'
  | 'visit'
  | 'sample_sent'
  | 'quotation_sent'
  | 'follow_up'
  | 'note'

export const FOLLOWUP_TASK_TYPE_LABELS: Record<FollowUpTaskType, string> = {
  phone_call: '📞 โทรศัพท์',
  whatsapp: '💬 WhatsApp',
  email: '✉️ อีเมล',
  meeting: '🤝 ประชุม',
  visit: '🚗 เยี่ยมลูกค้า',
  sample_sent: '📦 ส่งตัวอย่าง',
  quotation_sent: '📝 ส่งใบเสนอราคา',
  follow_up: '🔁 ติดตามงาน',
  note: '🗒️ บันทึก',
}

export type FollowUpStatus = 'open' | 'done' | 'overdue'

export const FOLLOWUP_STATUS_LABELS: Record<FollowUpStatus, string> = {
  open: 'รอดำเนินการ',
  done: 'เสร็จสิ้น',
  overdue: 'เกินกำหนด',
}

export type SalesFollowUp = {
  id: string
  customer_id: string
  sales_rep_id: string | null
  due_date: string
  task_type: FollowUpTaskType
  note: string | null
  status: 'open' | 'done'
  created_by: string | null
  created_at: string
  updated_at: string
}

export function followUpDisplayStatus(task: Pick<SalesFollowUp, 'status' | 'due_date'>): FollowUpStatus {
  if (task.status === 'done') return 'done'
  const today = new Date().toISOString().slice(0, 10)
  return task.due_date < today ? 'overdue' : 'open'
}

export function generateQuotationNumber(sequenceValue: number) {
  return `QT-${String(sequenceValue).padStart(6, '0')}`
}

export function calcLineNet(kg: number, unitPrice: number, discountPercent: number, discountAmount: number) {
  const gross = kg * unitPrice
  const afterPercent = gross - gross * (discountPercent / 100)
  return Math.max(0, afterPercent - discountAmount)
}

export function calcLineTax(lineNet: number, taxPercent: number) {
  return lineNet * (taxPercent / 100)
}

export function calcLineTotal(kg: number, unitPrice: number, discountPercent: number, discountAmount: number, taxPercent: number) {
  const net = calcLineNet(kg, unitPrice, discountPercent, discountAmount)
  return net + calcLineTax(net, taxPercent)
}

export function lineRequiresApproval(unitPrice: number, discountPercent: number, tierPrice: number | null) {
  if (discountPercent > APPROVAL_DISCOUNT_THRESHOLD_PERCENT) return true
  if (tierPrice != null && unitPrice < tierPrice) return true
  return false
}
