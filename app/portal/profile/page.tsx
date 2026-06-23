import { createClient } from '@/lib/supabase/server'
import ProfileForm, { type CustomerProfile } from './ProfileForm'
import DocumentsUploader, { type DocRecord } from './DocumentsUploader'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: customer } = await supabase
    .from('customers')
    .select(
      'id, full_name, phone, whatsapp, email, country, province_city, customer_type, company_name, website, facebook, instagram, expected_monthly_volume, status, tier, payment_terms'
    )
    .eq('user_id', user?.id ?? '')
    .maybeSingle()

  let docs: DocRecord[] = []
  if (customer?.id) {
    const { data: rows } = await supabase
      .from('customer_documents')
      .select('id, doc_type, file_path')
      .eq('customer_id', customer.id)
    docs = await Promise.all(
      (rows ?? []).map(async (d) => {
        const { data: signed } = await supabase.storage.from('customer_documents').createSignedUrl(d.file_path, 3600)
        return { id: d.id, doc_type: d.doc_type, url: signed?.signedUrl ?? null }
      })
    )
  }

  return (
    <>
      <ProfileForm initial={(customer as CustomerProfile) ?? null} email={user?.email ?? ''} />
      {customer?.id && <DocumentsUploader customerId={customer.id} initialDocs={docs} />}
    </>
  )
}
