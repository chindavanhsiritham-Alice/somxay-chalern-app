import { createClient } from '@/lib/supabase/server'
import ProfileForm, { type CustomerProfile } from './ProfileForm'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: customer } = await supabase
    .from('customers')
    .select(
      'id, full_name, phone, whatsapp, email, country, province_city, customer_type, company_name, website, facebook, instagram, expected_monthly_volume, status, tier'
    )
    .eq('user_id', user?.id ?? '')
    .maybeSingle()

  return <ProfileForm initial={(customer as CustomerProfile) ?? null} email={user?.email ?? ''} />
}
