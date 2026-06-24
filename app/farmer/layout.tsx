import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { farmerTheme } from '@/lib/farmer/theme'
import FarmerTabBar from './FarmerTabBar'

export const metadata = {
  title: 'Somxay Coffee – พื้นที่เกษตรกร',
  description: 'ขายเชอร์รี่กาแฟ ดูประวัติการขาย และการจ่ายเงิน',
}

export default async function FarmerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle()

  const role = profile?.role ?? 'customer'
  if (role !== 'farmer') redirect(role === 'customer' ? '/portal' : '/admin')

  return (
    <div style={{ minHeight: '100vh', background: farmerTheme.cream, fontFamily: 'system-ui, sans-serif', color: farmerTheme.text, paddingBottom: 76 }}>
      <header style={{ background: farmerTheme.green, color: '#fff', padding: '16px 20px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>🌱 Somxay Coffee</div>
        <div style={{ fontSize: 12, opacity: 0.85 }}>
          พื้นที่เกษตรกร{profile?.full_name ? ` — ${profile.full_name}` : ''}
        </div>
      </header>
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '16px 16px 24px' }}>{children}</main>
      <FarmerTabBar />
    </div>
  )
}
