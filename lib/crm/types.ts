export type CustomerCategory =
  | 'retail'
  | 'cafe'
  | 'restaurant'
  | 'hotel'
  | 'office'
  | 'roaster'
  | 'distributor'
  | 'factory'
  | 'government'
  | 'export'

export const CUSTOMER_CATEGORY_LABELS: Record<CustomerCategory, string> = {
  retail: 'ร้านค้าปลีก',
  cafe: 'คาเฟ่',
  restaurant: 'ร้านอาหาร',
  hotel: 'โรงแรม',
  office: 'สำนักงาน',
  roaster: 'โรงคั่ว',
  distributor: 'ผู้จัดจำหน่าย',
  factory: 'โรงงาน',
  government: 'หน่วยงานราชการ',
  export: 'ส่งออก',
}

export type CustomerStatus = 'pending' | 'active' | 'suspended' | 'blacklisted' | 'rejected'

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  pending: 'รออนุมัติ',
  active: 'ใช้งานอยู่',
  suspended: 'ระงับชั่วคราว',
  blacklisted: 'บัญชีดำ',
  rejected: 'ถูกปฏิเสธ',
}

export type PipelineStage = 'lead' | 'interested' | 'sample_sent' | 'quotation' | 'negotiation' | 'won' | 'lost'

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  lead: 'Lead',
  interested: 'Interested',
  sample_sent: 'Sample Sent',
  quotation: 'Quotation',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
}

export const PIPELINE_STAGES: PipelineStage[] = ['lead', 'interested', 'sample_sent', 'quotation', 'negotiation', 'won', 'lost']

export type TimelineType =
  | 'phone_call'
  | 'meeting'
  | 'visit'
  | 'email'
  | 'whatsapp'
  | 'line'
  | 'sample_sent'
  | 'quotation_sent'
  | 'follow_up'
  | 'note'

export const TIMELINE_TYPE_LABELS: Record<TimelineType, string> = {
  phone_call: '📞 โทรศัพท์',
  meeting: '🤝 ประชุม',
  visit: '🚗 เยี่ยมลูกค้า',
  email: '✉️ อีเมล',
  whatsapp: '💬 WhatsApp',
  line: '💚 Line',
  sample_sent: '📦 ส่งตัวอย่าง',
  quotation_sent: '📝 ส่งใบเสนอราคา',
  follow_up: '🔁 ติดตามงาน',
  note: '🗒️ บันทึก',
}

export type DocumentType = 'business_registration' | 'tax_certificate' | 'passport_id' | 'contract' | 'import_license'

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  business_registration: 'หนังสือรับรองบริษัท',
  tax_certificate: 'ใบทะเบียนภาษี',
  passport_id: 'พาสปอร์ต/บัตรประชาชน',
  contract: 'สัญญา',
  import_license: 'ใบอนุญาตนำเข้า',
}

export type Customer = {
  id: string
  customer_code: string | null
  company_name: string | null
  shop_name: string | null
  owner_name: string | null
  contact_person: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  tax_id: string | null
  business_registration_number: string | null
  country: string | null
  province: string | null
  district: string | null
  village: string | null
  billing_address: string | null
  shipping_address: string | null
  google_map_url: string | null
  category: CustomerCategory | null
  tags: string[]
  status: CustomerStatus
  pipeline_stage: PipelineStage
  tier: string | null
  payment_term: string | null
  assigned_sales_rep: string | null
  profile_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type CustomerTimelineEntry = {
  id: string
  customer_id: string
  interaction_type: TimelineType
  note: string | null
  occurred_at: string
  created_by: string | null
  created_at: string
}

export type CustomerDocument = {
  id: string
  customer_id: string
  doc_type: DocumentType
  file_path: string
  file_name: string
  uploaded_by: string | null
  created_at: string
}

export type SalesRep = {
  id: string
  full_name: string | null
  role: string
}

export function generateCustomerCode() {
  const now = new Date()
  const stamp = now.toISOString().slice(2, 10).replace(/-/g, '')
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return `CUS${stamp}${rand}`
}
