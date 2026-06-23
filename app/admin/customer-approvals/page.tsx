import { createClient } from '@/lib/supabase/server'
import CustomerApprovals, { type AdminCustomer } from './CustomerApprovals'

export default async function CustomerApprovalsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('customers')
    .select(
      'id, full_name, company_name, email, phone, whatsapp, country, province_city, customer_type, expected_monthly_volume, website, facebook, instagram, status, tier, credit_enabled, payment_term_days, created_at'
    )
    .order('created_at', { ascending: false })

  return <CustomerApprovals initial={(data as AdminCustomer[]) ?? []} />
}
