import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const MENU = [
  { label: 'Product Catalog', href: '/portal' },
  { label: 'My Orders', href: '/portal/orders' },
  { label: 'My Shipments', href: '/portal/shipments' },
  { label: 'My Documents', href: '/portal/documents' },
  { label: 'Request Sample', href: '/portal/samples' },
  { label: 'Feedback', href: '/portal/feedback' },
  { label: 'Contact Sales', href: '/portal/contact' },
]

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role && profile.role !== 'customer') redirect('/admin')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <aside style={{ width: 220, background: '#2d4a3a', color: '#fff', padding: '24px 20px', flexShrink: 0 }}>
        <h2 style={{ color: '#a8e063', marginBottom: 4, fontSize: 20 }}>☕ Somxay Coffee</h2>
        <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 24 }}>
          Customer Portal{profile?.full_name ? ` — ${profile.full_name}` : ''}
        </p>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {MENU.map((item) => (
            <Link key={item.href} href={item.href} style={{ color: '#fff', textDecoration: 'none', padding: '8px 10px', borderRadius: 6, fontSize: 14 }}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main style={{ flex: 1, padding: 32, background: '#f5f7f2' }}>{children}</main>
    </div>
  )
}
