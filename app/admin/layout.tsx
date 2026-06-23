import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const MENUS: Record<string, { label: string; href: string; icon: string }[]> = {
  admin: [
    { label: 'Executive Dashboard', href: '/admin', icon: '📊' },
    { label: 'Customer Management', href: '/admin/customers', icon: '👥' },
    { label: 'Customer Approvals', href: '/admin/customer-approvals', icon: '✅' },
    { label: 'Product & Inventory', href: '/admin/products', icon: '📦' },
    { label: 'Exchange Rates', href: '/admin/exchange-rates', icon: '💱' },
    { label: 'Orders', href: '/admin/orders', icon: '🛒' },
    { label: 'Quotations', href: '/admin/quotations', icon: '📝' },
    { label: 'Contracts', href: '/admin/contracts', icon: '📄' },
    { label: 'Payments', href: '/admin/payments', icon: '💳' },
    { label: 'Shipments', href: '/admin/shipments', icon: '🚚' },
    { label: 'Samples', href: '/admin/samples', icon: '🧪' },
    { label: 'Documents', href: '/admin/documents', icon: '📁' },
    { label: 'Reports', href: '/admin/reports', icon: '📈' },
    { label: 'User Management', href: '/admin/users', icon: '👤' },
  ],
  manager: [
    { label: 'Executive Dashboard', href: '/admin', icon: '📊' },
    { label: 'Customer Management', href: '/admin/customers', icon: '👥' },
    { label: 'Customer Approvals', href: '/admin/customer-approvals', icon: '✅' },
    { label: 'Product & Inventory', href: '/admin/products', icon: '📦' },
    { label: 'Exchange Rates', href: '/admin/exchange-rates', icon: '💱' },
    { label: 'Orders', href: '/admin/orders', icon: '🛒' },
    { label: 'Quotations', href: '/admin/quotations', icon: '📝' },
    { label: 'Contracts', href: '/admin/contracts', icon: '📄' },
    { label: 'Payments', href: '/admin/payments', icon: '💳' },
    { label: 'Shipments', href: '/admin/shipments', icon: '🚚' },
    { label: 'Samples', href: '/admin/samples', icon: '🧪' },
    { label: 'Documents', href: '/admin/documents', icon: '📁' },
    { label: 'Reports', href: '/admin/reports', icon: '📈' },
  ],
  sales: [
    { label: 'Customers', href: '/admin/customers', icon: '👥' },
    { label: 'Quotations', href: '/admin/quotations', icon: '📝' },
    { label: 'Orders', href: '/admin/orders', icon: '🛒' },
    { label: 'Samples', href: '/admin/samples', icon: '🧪' },
    { label: 'Follow-up Tasks', href: '/admin/tasks', icon: '✅' },
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
      <aside style={{ width: 250, background: '#1f3d2e', color: '#fff', padding: '28px 18px', flexShrink: 0 }}>
        <h2 style={{ color: '#a8e063', marginBottom: 2, fontSize: 20 }}>☕ Somxay Coffee</h2>
        <p style={{ fontSize: 12, opacity: 0.65, marginBottom: 28 }}>
          {role.toUpperCase()}{profile?.full_name ? ` — ${profile.full_name}` : ''}
        </p>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {menu.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                color: '#fff',
                textDecoration: 'none',
                padding: '10px 12px',
                borderRadius: 8,
                fontSize: 14,
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <main style={{ flex: 1, padding: 36, background: '#f5f7f2' }}>{children}</main>
    </div>
  )
}
