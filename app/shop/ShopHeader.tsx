'use client'

import Link from 'next/link'
import { useCart } from '@/lib/shop/cart-context'
import { shopTheme } from '@/lib/shop/theme'

export default function ShopHeader() {
  const { totalCount } = useCart()

  return (
    <header
      style={{
        background: shopTheme.maroon,
        color: '#fff',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <Link href="/shop" style={{ color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 22 }}>☕</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>Somxay Coffee Shop</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>สั่งเครื่องดื่ม รับที่สาขา</div>
        </div>
      </Link>
      <Link
        href="/shop/cart"
        style={{
          color: '#fff',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(255,255,255,0.15)',
          padding: '8px 14px',
          borderRadius: 999,
          fontSize: 14,
        }}
      >
        🛒 ตะกร้า
        {totalCount > 0 && (
          <span
            style={{
              background: shopTheme.gold,
              color: shopTheme.maroonDark,
              borderRadius: 999,
              padding: '1px 8px',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {totalCount}
          </span>
        )}
      </Link>
    </header>
  )
}
