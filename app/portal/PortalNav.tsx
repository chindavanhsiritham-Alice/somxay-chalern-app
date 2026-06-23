'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCartCount } from '@/lib/cart'

const LINKS = [
  { href: '/portal/products', label: 'Products' },
  { href: '/portal/orders', label: 'My Orders' },
  { href: '/portal/profile', label: 'Profile' },
]

export default function PortalNav({ name }: { name: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const count = useCartCount()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/portal/login')
    router.refresh()
  }

  return (
    <header style={{ background: '#1f3d2e', color: '#fff' }}>
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <Link href="/portal/products" style={{ color: '#a8e063', fontWeight: 700, fontSize: 18, textDecoration: 'none' }}>
          ☕ Somxay Coffee
        </Link>

        <nav style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginLeft: 'auto', alignItems: 'center' }}>
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + '/')
            return (
              <Link
                key={l.href}
                href={l.href}
                style={{
                  color: '#fff',
                  textDecoration: 'none',
                  padding: '7px 12px',
                  borderRadius: 8,
                  fontSize: 14,
                  background: active ? 'rgba(168,224,99,0.22)' : 'transparent',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {l.label}
              </Link>
            )
          })}

          <Link
            href="/portal/cart"
            style={{
              color: '#1f3d2e',
              background: '#a8e063',
              textDecoration: 'none',
              padding: '7px 14px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Cart{count > 0 ? ` (${count})` : ''}
          </Link>

          <button
            onClick={signOut}
            style={{
              background: 'transparent',
              color: '#cde8c0',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 8,
              padding: '7px 12px',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </nav>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px 10px', fontSize: 12, opacity: 0.7 }}>
        {name}
      </div>
    </header>
  )
}
