'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AuthCard, FieldLabel, TextInput, PrimaryButton, ErrorText } from '../authUI'

export default function PortalLoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    // Existing customers only — do not create a new user from the login screen.
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    setLoading(false)
    if (otpError) {
      setError(otpError.message)
      return
    }
    setStep('otp')
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: verifyError } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    setLoading(false)
    if (verifyError) {
      setError(verifyError.message)
      return
    }
    router.push('/portal/products')
    router.refresh()
  }

  return (
    <AuthCard title="Sign in" subtitle="B2B green coffee ordering">
      {step === 'email' ? (
        <form onSubmit={sendOtp}>
          <FieldLabel>Email</FieldLabel>
          <TextInput type="email" value={email} onChange={(v) => setEmail(v)} required placeholder="you@company.com" />
          <ErrorText>{error}</ErrorText>
          <PrimaryButton disabled={loading}>{loading ? 'Sending code…' : 'Email me a login code'}</PrimaryButton>
        </form>
      ) : (
        <form onSubmit={verifyOtp}>
          <p style={{ fontSize: 13, color: '#555', marginTop: 0 }}>
            We sent a 6-digit code to <strong>{email}</strong>.
          </p>
          <FieldLabel>Verification code</FieldLabel>
          <TextInput
            type="text"
            value={token}
            onChange={(v) => setToken(v.replace(/\D/g, '').slice(0, 6))}
            required
            placeholder="123456"
            inputMode="numeric"
          />
          <ErrorText>{error}</ErrorText>
          <PrimaryButton disabled={loading}>{loading ? 'Verifying…' : 'Verify & sign in'}</PrimaryButton>
          <button
            type="button"
            onClick={() => setStep('email')}
            style={{ background: 'none', border: 'none', color: '#6b8f5e', fontSize: 13, marginTop: 12, cursor: 'pointer' }}
          >
            ← Use a different email
          </button>
        </form>
      )}

      <p style={{ fontSize: 13, color: '#555', marginTop: 20, marginBottom: 0 }}>
        New customer?{' '}
        <Link href="/portal/register" style={{ color: '#2d7a3a', fontWeight: 600 }}>
          Create an account
        </Link>
      </p>
    </AuthCard>
  )
}
