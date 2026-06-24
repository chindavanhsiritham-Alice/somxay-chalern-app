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
  let credit: { credit_limit_usd: number | null; outstanding_usd: number | null; available_usd: number | null } | null = null
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

    const { data: bal } = await supabase
      .from('customer_balances')
      .select('credit_limit_usd, outstanding_usd, available_usd')
      .eq('customer_id', customer.id)
      .maybeSingle()
    credit = bal ?? null
  }

  const fmt = (n: number | null | undefined) =>
    n == null ? '-' : `$${Number(n).toLocaleString()}`

  return (
    <>
      <ProfileForm initial={(customer as CustomerProfile) ?? null} email={user?.email ?? ''} />

      {credit && (credit.credit_limit_usd ?? 0) > 0 && (
        <div style={{ maxWidth: 640, marginTop: 24 }}>
          <h2 style={{ color: '#2d4a3a', fontSize: 18, marginBottom: 12 }}>Credit</h2>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            {[
              { label: 'Credit Limit', value: fmt(credit.credit_limit_usd) },
              { label: 'Outstanding', value: fmt(credit.outstanding_usd) },
              { label: 'Available Credit', value: fmt(credit.available_usd) },
            ].map((s) => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <p style={{ fontSize: 12, color: '#6b8f5e', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#2d4a3a', margin: 0 }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {customer?.id && <DocumentsUploader customerId={customer.id} initialDocs={docs} />}
    </>
  )
}
