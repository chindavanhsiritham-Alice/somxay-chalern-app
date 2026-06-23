'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f1e8',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <form onSubmit={handleLogin} style={{
        background: '#fff',
        padding: 40,
        borderRadius: 16,
        width: 360,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)'
      }}>
        <h1 style={{ color: '#2d4a3a', marginTop: 0, fontSize: 24 }}>Somxay Coffee</h1>
        <p style={{ color: '#6b8f5e', marginBottom: 24, fontSize: 14 }}>เข้าสู่ระบบ</p>

        <label style={{ fontSize: 13, color: '#555' }}>อีเมล</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: 10, marginTop: 4, marginBottom: 16, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }}
        />

        <label style={{ fontSize: 13, color: '#555' }}>รหัสผ่าน</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: 10, marginTop: 4, marginBottom: 16, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }}
        />

        {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: 12,
            background: '#2d4a3a',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>

        <a href="/shop" style={{ display: 'block', textAlign: 'center', marginTop: 16, fontSize: 13, color: '#7a2331' }}>
          ☕ สั่งกาแฟที่หน้าร้าน (ไม่ต้องเข้าสู่ระบบ)
        </a>
      </form>
    </div>
  )
}
