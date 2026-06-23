import { createClient } from '@/lib/supabase/server'
import CustomerApprovals, { type AdminCustomer, type CustomerDoc } from './CustomerApprovals'

export default async function CustomerApprovalsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('customers')
    .select(
      'id, full_name, company_name, email, phone, whatsapp, country, province_city, customer_type, expected_monthly_volume, website, facebook, instagram, status, tier, payment_terms, credit_enabled, payment_term_days, created_at'
    )
    .order('created_at', { ascending: false })

  const { data: docs } = await supabase
    .from('customer_documents')
    .select('id, customer_id, doc_type, file_path')

  // Pre-sign document URLs so admins can view uploads.
  const docsByCustomer: Record<string, CustomerDoc[]> = {}
  for (const d of docs ?? []) {
    const { data: signed } = await supabase.storage.from('customer_documents').createSignedUrl(d.file_path, 3600)
    const entry: CustomerDoc = { id: d.id, doc_type: d.doc_type, url: signed?.signedUrl ?? null }
    ;(docsByCustomer[d.customer_id] ??= []).push(entry)
  }

  return <CustomerApprovals initial={(data as AdminCustomer[]) ?? []} docsByCustomer={docsByCustomer} />
}
