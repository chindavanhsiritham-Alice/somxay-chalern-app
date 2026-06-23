// Shared constants and helpers for the customer portal.

export const CUSTOMER_TYPES = [
  'Home Roaster',
  'Cafe',
  'Coffee Shop',
  'Small Roaster',
  'Trader',
  'Distributor',
  'Hotel',
  'Other',
] as const
export type CustomerType = (typeof CUSTOMER_TYPES)[number]

export const CUSTOMER_STATUSES = ['pending', 'approved', 'active', 'suspended', 'blacklisted'] as const
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number]

// Statuses allowed to place orders.
export const ORDER_CAPABLE_STATUSES = ['approved', 'active'] as const
export function canOrder(status: string | null | undefined): boolean {
  return status != null && (ORDER_CAPABLE_STATUSES as readonly string[]).includes(status)
}

export const CUSTOMER_TIERS = ['retail', 'wholesale', 'distributor', 'vip'] as const
export type CustomerTier = (typeof CUSTOMER_TIERS)[number]

export const TIER_LABELS: Record<string, string> = {
  retail: 'Retail',
  wholesale: 'Wholesale',
  distributor: 'Distributor',
  vip: 'VIP',
}

// Payment terms. Default is prepaid; credit terms are admin-assigned only.
export const PAYMENT_TERMS = [
  { value: 'prepaid', label: 'Prepaid' },
  { value: 'credit_3', label: 'Credit 3 Days' },
  { value: 'credit_5', label: 'Credit 5 Days' },
] as const
export const PAYMENT_TERM_LABELS: Record<string, string> = {
  prepaid: 'Prepaid',
  credit_3: 'Credit 3 Days',
  credit_5: 'Credit 5 Days',
}
// Numeric credit days kept in sync for downstream order logic.
export const PAYMENT_TERM_TO_DAYS: Record<string, number> = {
  prepaid: 0,
  credit_3: 3,
  credit_5: 5,
}

// Optional customer documents.
export const DOCUMENT_TYPES = [
  { value: 'company_registration', label: 'Company Registration' },
  { value: 'tax_certificate', label: 'Tax Certificate' },
  { value: 'id_passport', label: 'ID Card / Passport' },
] as const
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  company_registration: 'Company Registration',
  tax_certificate: 'Tax Certificate',
  id_passport: 'ID Card / Passport',
}

// Preset package sizes (kg) plus a custom option handled in the UI.
export const PACKAGE_OPTIONS = [10, 20, 25, 30, 60] as const

// Order lifecycle (in flow order).
export const ORDER_FLOW = [
  'pending_payment',
  'payment_submitted',
  'payment_confirmed',
  'preparing',
  'ready_for_pickup',
  'completed',
] as const
export type OrderStatus = (typeof ORDER_FLOW)[number] | 'cancelled'

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pending Payment',
  payment_submitted: 'Payment Submitted',
  payment_confirmed: 'Payment Confirmed',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready for Pickup',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const ORDER_STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  pending_payment: { bg: '#fdeec0', fg: '#8a6d1a' },
  payment_submitted: { bg: '#d6e7fb', fg: '#1b4f86' },
  payment_confirmed: { bg: '#d4f0d4', fg: '#256029' },
  preparing: { bg: '#e7defb', fg: '#5b3a9a' },
  ready_for_pickup: { bg: '#cdeef0', fg: '#1f6b73' },
  completed: { bg: '#d4f0d4', fg: '#256029' },
  cancelled: { bg: '#f5d6d6', fg: '#9a2a2a' },
}

export const STATUS_BADGE_COLORS: Record<string, { bg: string; fg: string }> = {
  pending: { bg: '#fdeec0', fg: '#8a6d1a' },
  approved: { bg: '#d4f0d4', fg: '#256029' },
  active: { bg: '#c7ecc7', fg: '#1d5024' },
  suspended: { bg: '#e2e2e2', fg: '#666' },
  blacklisted: { bg: '#3a3a3a', fg: '#fff' },
  rejected: { bg: '#f5d6d6', fg: '#9a2a2a' },
}

export function money(prefix: string, value: number | null | undefined): string {
  if (value == null) return '-'
  return `${prefix}${Number(value).toLocaleString()}`
}

export function daysLeft(deadline: string | null | undefined): number | null {
  if (!deadline) return null
  const ms = new Date(deadline).getTime() - Date.now()
  if (Number.isNaN(ms)) return null
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}
