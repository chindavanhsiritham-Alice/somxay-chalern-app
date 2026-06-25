import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Customer, CustomerTimelineEntry, CustomerDocument } from '@/lib/crm/types'
import PortalProfileManager from './PortalProfileManager'

export default async function PortalProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('profile_id', user.id)
    .maybeSingle()

  let timeline: CustomerTimelineEntry[] = []
  let documents: CustomerDocument[] = []

  if (customer) {
    const [{ data: timelineData }, { data: documentsData }] = await Promise.all([
      supabase
        .from('customer_timeline')
        .select('*')
        .eq('customer_id', customer.id)
        .order('occurred_at', { ascending: false }),
      supabase
        .from('customer_documents')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false }),
    ])
    timeline = (timelineData ?? []) as CustomerTimelineEntry[]
    documents = (documentsData ?? []) as CustomerDocument[]
  }

  return (
    <PortalProfileManager
      userId={user.id}
      userEmail={user.email ?? null}
      customer={(customer ?? null) as Customer | null}
      timeline={timeline}
      documents={documents}
    />
  )
}
