import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type MenuItem = { label: string; href: string; icon: string }
type MenuSection = { title: string; items: MenuItem[] }

const SECTIONS: Record<string, MenuSection[]> = {
  admin: [
    { title: 'ภาพรวม', items: [{ label: 'Executive Dashboard', href: '/admin', icon: '📊' }] },
    {
      title: 'งานขาย',
      items: [
        { label: 'Customer Management', href: '/admin/customers', icon: '👥' },
        { label: 'Sales Pipeline', href: '/admin/sales-pipeline', icon: '🧭' },
        { label: 'Customer Dashboard', href: '/admin/customer-dashboard', icon: '📈' },
        { label: 'Quotations', href: '/admin/quotations', icon: '📝' },
        { label: 'Orders', href: '/admin/orders', icon: '🛒' },
        { label: 'Shop Orders', href: '/admin/shop-orders', icon: '☕' },
        { label: 'Samples', href: '/admin/samples', icon: '🧪' },
      ],
    },
    {
      title: 'สินค้า/ราคา',
      items: [
        { label: 'Product & Inventory', href: '/admin/products', icon: '📦' },
        { label: 'Exchange Rates', href: '/admin/exchange-rates', icon: '💱' },
      ],
    },
    {
      title: 'รับซื้อเชอร์รี่',
      items: [
        { label: 'Cherry Bookings', href: '/admin/cherry-bookings', icon: '🍒' },
        { label: 'Farmer Credit', href: '/admin/farmer-credit', icon: '💳' },
        { label: 'Farmer Year Summary', href: '/admin/farmer-year-summary', icon: '📅' },
      ],
    },
    {
      title: 'คิวรับเชอร์รี่',
      items: [
        { label: 'Delivery Queue', href: '/admin/delivery-queue', icon: '🚦' },
        { label: 'Delivery Reports', href: '/admin/delivery-reports', icon: '⏱️' },
      ],
    },
    {
      title: 'คลังสินค้า',
      items: [
        { label: 'Warehouse Dashboard', href: '/admin/warehouse', icon: '🏭' },
        { label: 'Cherry Inventory', href: '/admin/inventory-cherry', icon: '🍒' },
        { label: 'Parchment Inventory', href: '/admin/inventory-parchment', icon: '🌰' },
        { label: 'Green Bean Inventory', href: '/admin/inventory-green-bean', icon: '🟢' },
        { label: 'Roasted Bean Inventory', href: '/admin/inventory-roasted-bean', icon: '🔥' },
        { label: 'Stock Movements', href: '/admin/stock-movements', icon: '🔁' },
        { label: 'Inventory Reports', href: '/admin/inventory-reports', icon: '📊' },
      ],
    },
    {
      title: 'ปฏิบัติการ',
      items: [
        { label: 'Contracts', href: '/admin/contracts', icon: '📄' },
        { label: 'Payments', href: '/admin/payments', icon: '💳' },
        { label: 'Shipments', href: '/admin/shipments', icon: '🚚' },
        { label: 'Documents', href: '/admin/documents', icon: '📁' },
      ],
    },
    { title: 'รายงาน', items: [{ label: 'Reports', href: '/admin/reports', icon: '📈' }] },
    { title: 'ระบบ', items: [{ label: 'User Management', href: '/admin/users', icon: '👤' }] },
  ],
  manager: [
    { title: 'ภาพรวม', items: [{ label: 'Executive Dashboard', href: '/admin', icon: '📊' }] },
    {
      title: 'งานขาย',
      items: [
        { label: 'Customer Management', href: '/admin/customers', icon: '👥' },
        { label: 'Sales Pipeline', href: '/admin/sales-pipeline', icon: '🧭' },
        { label: 'Customer Dashboard', href: '/admin/customer-dashboard', icon: '📈' },
        { label: 'Quotations', href: '/admin/quotations', icon: '📝' },
        { label: 'Orders', href: '/admin/orders', icon: '🛒' },
        { label: 'Shop Orders', href: '/admin/shop-orders', icon: '☕' },
        { label: 'Samples', href: '/admin/samples', icon: '🧪' },
      ],
    },
    {
      title: 'สินค้า/ราคา',
      items: [
        { label: 'Product & Inventory', href: '/admin/products', icon: '📦' },
        { label: 'Exchange Rates', href: '/admin/exchange-rates', icon: '💱' },
      ],
    },
    {
      title: 'รับซื้อเชอร์รี่',
      items: [
        { label: 'Cherry Bookings', href: '/admin/cherry-bookings', icon: '🍒' },
        { label: 'Farmer Credit', href: '/admin/farmer-credit', icon: '💳' },
        { label: 'Farmer Year Summary', href: '/admin/farmer-year-summary', icon: '📅' },
      ],
    },
    {
      title: 'คิวรับเชอร์รี่',
      items: [
        { label: 'Delivery Queue', href: '/admin/delivery-queue', icon: '🚦' },
        { label: 'Delivery Reports', href: '/admin/delivery-reports', icon: '⏱️' },
      ],
    },
    {
      title: 'คลังสินค้า',
      items: [
        { label: 'Warehouse Dashboard', href: '/admin/warehouse', icon: '🏭' },
        { label: 'Cherry Inventory', href: '/admin/inventory-cherry', icon: '🍒' },
        { label: 'Parchment Inventory', href: '/admin/inventory-parchment', icon: '🌰' },
        { label: 'Green Bean Inventory', href: '/admin/inventory-green-bean', icon: '🟢' },
        { label: 'Roasted Bean Inventory', href: '/admin/inventory-roasted-bean', icon: '🔥' },
        { label: 'Stock Movements', href: '/admin/stock-movements', icon: '🔁' },
        { label: 'Inventory Reports', href: '/admin/inventory-reports', icon: '📊' },
      ],
    },
    {
      title: 'ปฏิบัติการ',
      items: [
        { label: 'Contracts', href: '/admin/contracts', icon: '📄' },
        { label: 'Payments', href: '/admin/payments', icon: '💳' },
        { label: 'Shipments', href: '/admin/shipments', icon: '🚚' },
        { label: 'Documents', href: '/admin/documents', icon: '📁' },
      ],
    },
    { title: 'รายงาน', items: [{ label: 'Reports', href: '/admin/reports', icon: '📈' }] },
  ],
  sales: [
    {
      title: 'งานขาย',
      items: [
        { label: 'Customers', href: '/admin/customers', icon: '👥' },
        { label: 'Sales Pipeline', href: '/admin/sales-pipeline', icon: '🧭' },
        { label: 'Customer Dashboard', href: '/admin/customer-dashboard', icon: '📈' },
        { label: 'Quotations', href: '/admin/quotations', icon: '📝' },
        { label: 'Orders', href: '/admin/orders', icon: '🛒' },
        { label: 'Shop Orders', href: '/admin/shop-orders', icon: '☕' },
        { label: 'Samples', href: '/admin/samples', icon: '🧪' },
        { label: 'Follow-up Tasks', href: '/admin/tasks', icon: '✅' },
      ],
    },
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

  const sections = SECTIONS[role] ?? SECTIONS.sales

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <aside style={{ width: 250, background: '#1f3d2e', color: '#fff', padding: '28px 18px', flexShrink: 0, overflowY: 'auto' }}>
        <h2 style={{ color: '#a8e063', marginBottom: 2, fontSize: 20 }}>☕ Somxay Coffee</h2>
        <p style={{ fontSize: 12, opacity: 0.65, marginBottom: 24 }}>
          {role.toUpperCase()}{profile?.full_name ? ` — ${profile.full_name}` : ''}
        </p>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {sections.map((section) => (
            <div key={section.title}>
              <div style={{ fontSize: 11, opacity: 0.55, textTransform: 'uppercase', letterSpacing: 0.6, padding: '0 12px', marginBottom: 4 }}>
                {section.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      color: '#fff',
                      textDecoration: 'none',
                      padding: '9px 12px',
                      borderRadius: 8,
                      fontSize: 14,
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <main style={{ flex: 1, padding: 36, background: '#f5f7f2' }}>{children}</main>
    </div>
  )
}
