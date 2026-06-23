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

export const CUSTOMER_STATUSES = ['pending', 'approved', 'rejected', 'suspended'] as const
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number]

export const CUSTOMER_TIERS = ['retail', 'wholesale', 'strategic'] as const
export type CustomerTier = (typeof CUSTOMER_TIERS)[number]

export const PAYMENT_TERM_DAYS = [0, 3, 5] as const

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
  rejected: { bg: '#f5d6d6', fg: '#9a2a2a' },
  suspended: { bg: '#e2e2e2', fg: '#666' },
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
