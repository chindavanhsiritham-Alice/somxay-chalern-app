import { createClient } from '@/lib/supabase/server'
import { getSalesReps } from '@/lib/crm/data'
import type { Customer, CustomerTimelineEntry, CustomerDocument } from '@/lib/crm/types'
import { notFound } from 'next/navigation'
import CustomerDetailManager from './CustomerDetailManager'

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: customer }, salesReps, { data: timeline }, { data: documents }] = await Promise.all([
    supabase.from('customers').select('*').eq('id', id).maybeSingle(),
    getSalesReps(supabase),
    supabase
      .from('customer_timeline')
      .select('*')
      .eq('customer_id', id)
      .order('occurred_at', { ascending: false }),
    supabase
      .from('customer_documents')
      .select('*')
      .eq('customer_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!customer) notFound()

  return (
    <CustomerDetailManager
      customer={customer as Customer}
      salesReps={salesReps}
      initialTimeline={(timeline ?? []) as CustomerTimelineEntry[]}
      initialDocuments={(documents ?? []) as CustomerDocument[]}
    />
  )
}
