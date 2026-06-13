import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const MENUS: Record<string, { label: string; href: string }[]> = {
  admin: [
    { label: 'Executive Dashboard', href: '/admin' },
    { label: 'Customer Management', href: '/admin/customers' },
    { label: 'Product & Inventory', href: '/admin/products' },
    { label: 'Orders', href: '/admin/orders' },
    { label: 'Quotations', href: '/admin/quotations' },
    { label: 'Contracts', href: '/admin/contracts' },
    { label: 'Payments', href: '/admin/payments' },
    { label: 'Shipments', href: '/admin/shipments' },
    { label: 'Samples', href: '/admin/samples' },
    { label: 'Documents', href: '/admin/documents' },
    { label: 'Reports', href: '/admin/reports' },
    { label: 'User Management', href: '/admin/users' },
  ],
  manager: [
    { label: 'Executive Dashboard', href: '/admin' },
    { label: 'Customer Management', href: '/admin/customers' },
    { label: 'Product & Inventory', href: '/admin/products' },
    { label: 'Orders', href: '/admin/orders' },
    { label: 'Quotations', href: '/admin/quotations' },
    { label: 'Contracts', href: '/admin/contracts' },
    { label: 'Payments', href: '/admin/payments' },
    { label: 'Shipments', href: '/admin/shipments' },
    { label: 'Samples', href: '/admin/samples' },
    { label: 'Documents', href: '/admin/documents' },
    { label: 'Reports', href: '/admin/reports' },
  ],
  sales: [
    { label: 'Customers', href: '/admin/customers' },
    { label: 'Quotations', href: '/admin/quotations' },
    { label: 'Orders', href: '/admin/orders' },
    { label: 'Samples', href: '/admin/samples' },
    { label: 'Follow-up Tasks', href: '/admin/tasks' },
  ],
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle()

  const role = profile?.role ?? 'customer'
  if (role === 'customer') redirect('/portal')

  const menu = MENUS[role] ?? MENUS.sales

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <aside style={{ width: 240, background: '#1f3d2e', color: '#fff', padding: '24px 20px', flexShrink: 0 }}>
        <h2 style={{ color: '#a8e063', marginBottom: 4, fontSize: 20 }}>☕ Somxay Coffee</h2>
        <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 24 }}>
          {role.toUpperCase()}{profile?.full_name ? ` — ${profile.full_name}` : ''}
        </p>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {menu.map((item) => (
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
