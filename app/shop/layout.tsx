import { CartProvider } from '@/lib/shop/cart-context'
import ShopHeader from './ShopHeader'
import { shopTheme } from '@/lib/shop/theme'

export const metadata = {
  title: 'Somxay Coffee Shop',
  description: 'สั่งเครื่องดื่มออนไลน์ รับที่สาขา',
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div style={{ minHeight: '100vh', background: shopTheme.cream, fontFamily: 'system-ui, sans-serif', color: shopTheme.text }}>
        <ShopHeader />
        <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 20px 60px' }}>{children}</main>
      </div>
    </CartProvider>
  )
}
