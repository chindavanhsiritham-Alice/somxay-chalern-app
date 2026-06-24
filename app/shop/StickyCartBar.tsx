'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCart } from '@/lib/shop/cart-context'
import { shopTheme } from '@/lib/shop/theme'

export default function StickyCartBar() {
  const { totalCount, totalPrice } = useCart()
  const pathname = usePathname()

  if (totalCount === 0) return null
  if (pathname === '/shop/cart' || pathname === '/shop/checkout') return null

  return (
    <Link
      href="/shop/cart"
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        maxWidth: 960,
        margin: '0 auto',
        background: shopTheme.maroon,
        color: '#fff',
        borderRadius: 14,
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        textDecoration: 'none',
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        zIndex: 15,
      }}
    >
      <span style={{ fontSize: 14 }}>🛒 {totalCount} รายการ · {totalPrice} บาท</span>
      <span style={{ fontWeight: 700, fontSize: 14 }}>ไปตะกร้า →</span>
    </Link>
  )
}
