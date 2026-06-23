import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PortalNav from './PortalNav'
import { STATUS_BADGE_COLORS } from '@/lib/portal'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Unauthenticated visitors only reach /portal/login or /portal/register (enforced
  // by middleware) — render those screens without the portal chrome.
  if (!user) {
    return <>{children}</>
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role && profile.role !== 'customer') redirect('/admin')

  const { data: customer } = await supabase
    .from('customers')
    .select('full_name, company_name, status')
    .eq('user_id', user.id)
    .maybeSingle()

  const displayName = customer?.full_name || customer?.company_name || user.email || 'Customer'
  const status = customer?.status as string | undefined

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7f2', fontFamily: 'system-ui, sans-serif' }}>
      <PortalNav name={displayName} />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 48px' }}>
        {!customer && (
          <Banner color={STATUS_BADGE_COLORS.pending}>
            Finish setting up your account on the{' '}
            <Link href="/portal/profile" style={{ color: '#8a6d1a', fontWeight: 600 }}>
              profile page
            </Link>{' '}
            to start ordering.
          </Banner>
        )}
        {status && status !== 'approved' && status !== 'active' && (
          <Banner color={STATUS_BADGE_COLORS[status] ?? STATUS_BADGE_COLORS.pending}>
            {status === 'pending' && 'Your account is pending approval. You can browse products, but ordering unlocks once an admin approves you.'}
            {status === 'suspended' && 'Your account is currently suspended. Please contact our sales team.'}
            {status === 'blacklisted' && 'Your account has been blocked. Please contact our sales team.'}
            {status === 'rejected' && 'Your account application was not approved. Please contact our sales team.'}
          </Banner>
        )}
        {children}
      </main>
    </div>
  )
}

function Banner({ color, children }: { color: { bg: string; fg: string }; children: React.ReactNode }) {
  return (
    <div style={{ background: color.bg, color: color.fg, padding: '12px 16px', borderRadius: 10, fontSize: 14, marginBottom: 20 }}>
      {children}
    </div>
  )
}
