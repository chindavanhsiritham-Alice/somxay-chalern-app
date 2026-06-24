'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { farmerTheme } from '@/lib/farmer/theme'

const TABS = [
  { href: '/farmer', label: 'หน้าหลัก', icon: '🏠' },
  { href: '/farmer/sell-cherry', label: 'ขายเชอร์รี่', icon: '🍒' },
  { href: '/farmer/bookings', label: 'รายการขาย', icon: '📋' },
  { href: '/farmer/payments', label: 'การจ่ายเงิน', icon: '💰' },
  { href: '/farmer/credit', label: 'หนี้/เครดิต', icon: '💳' },
]

export default function FarmerTabBar() {
  const pathname = usePathname()

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#fff',
        borderTop: `1px solid ${farmerTheme.border}`,
        display: 'flex',
        zIndex: 15,
      }}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '8px 4px 10px',
              textDecoration: 'none',
              color: active ? farmerTheme.green : farmerTheme.muted,
            }}
          >
            <div style={{ fontSize: 20 }}>{tab.icon}</div>
            <div style={{ fontSize: 11, fontWeight: active ? 700 : 400 }}>{tab.label}</div>
          </Link>
        )
      })}
    </nav>
  )
}
