'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CUSTOMER_TYPES } from '@/lib/portal'
import { AuthCard, FieldLabel, TextInput, SelectInput, PrimaryButton, ErrorText } from '../authUI'

interface RegForm {
  full_name: string
  phone: string
  whatsapp: string
  email: string
  country: string
  province_city: string
  customer_type: string
  company_name: string
  website: string
  facebook: string
  instagram: string
  expected_monthly_volume: string
}

const EMPTY: RegForm = {
  full_name: '',
  phone: '',
  whatsapp: '',
  email: '',
  country: '',
  province_city: '',
  customer_type: '',
  company_name: '',
  website: '',
  facebook: '',
  instagram: '',
  expected_monthly_volume: '',
}

export default function RegisterPage() {
  const supabase = createClient()
  const router = useRouter()
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [form, setForm] = useState<RegForm>(EMPTY)
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(key: keyof RegForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    // Email OTP. NOTE: phone/whatsapp are captured now so that a future SMS OTP
    // (supabase.auth.signInWithOtp({ phone })) can be wired in without schema changes.
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: form.email,
      options: { shouldCreateUser: true },
    })
    setLoading(false)
    if (otpError) {
      setError(otpError.message)
      return
    }
    setStep('otp')
  }

  async function verifyAndCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: verifyError } = await supabase.auth.verifyOtp({ email: form.email, token, type: 'email' })
    if (verifyError) {
      setLoading(false)
      setError(verifyError.message)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      setError('Verification succeeded but no session was created. Please try signing in.')
      return
    }

    const { error: insertError } = await supabase.from('customers').insert({
      user_id: user.id,
      email: form.email,
      full_name: form.full_name,
      phone: form.phone,
      whatsapp: form.whatsapp,
      country: form.country,
      province_city: form.province_city,
      customer_type: form.customer_type,
      company_name: form.company_name || null,
      website: form.website || null,
      facebook: form.facebook || null,
      instagram: form.instagram || null,
      expected_monthly_volume: form.expected_monthly_volume || null,
      status: 'pending',
      tier: 'retail',
    })

    setLoading(false)

    // A duplicate means this account already has a profile — that's fine, continue.
    if (insertError && !insertError.message.toLowerCase().includes('duplicate')) {
      setError(insertError.message)
      return
    }

    router.push('/portal/profile')
    router.refresh()
  }

  return (
    <AuthCard title="Create your account" subtitle="Register to order green coffee from Somxay" wide>
      {step === 'form' ? (
        <form onSubmit={sendOtp}>
          <div style={{ display: 'grid', gap: 0, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', columnGap: 14 }}>
            <div>
              <FieldLabel required>Full name</FieldLabel>
              <TextInput value={form.full_name} onChange={(v) => set('full_name', v)} required />
            </div>
            <div>
              <FieldLabel required>Email</FieldLabel>
              <TextInput type="email" value={form.email} onChange={(v) => set('email', v)} required />
            </div>
            <div>
              <FieldLabel required>Phone</FieldLabel>
              <TextInput type="tel" value={form.phone} onChange={(v) => set('phone', v)} required inputMode="tel" />
            </div>
            <div>
              <FieldLabel required>WhatsApp</FieldLabel>
              <TextInput type="tel" value={form.whatsapp} onChange={(v) => set('whatsapp', v)} required inputMode="tel" />
            </div>
            <div>
              <FieldLabel required>Country</FieldLabel>
              <TextInput value={form.country} onChange={(v) => set('country', v)} required />
            </div>
            <div>
              <FieldLabel required>Province / City</FieldLabel>
              <TextInput value={form.province_city} onChange={(v) => set('province_city', v)} required />
            </div>
            <div>
              <FieldLabel required>Customer type</FieldLabel>
              <SelectInput value={form.customer_type} onChange={(v) => set('customer_type', v)} options={CUSTOMER_TYPES} required />
            </div>
            <div>
              <FieldLabel>Company name</FieldLabel>
              <TextInput value={form.company_name} onChange={(v) => set('company_name', v)} />
            </div>
            <div>
              <FieldLabel>Website</FieldLabel>
              <TextInput value={form.website} onChange={(v) => set('website', v)} />
            </div>
            <div>
              <FieldLabel>Expected monthly volume</FieldLabel>
              <TextInput value={form.expected_monthly_volume} onChange={(v) => set('expected_monthly_volume', v)} placeholder="e.g. 500 kg" />
            </div>
            <div>
              <FieldLabel>Facebook</FieldLabel>
              <TextInput value={form.facebook} onChange={(v) => set('facebook', v)} />
            </div>
            <div>
              <FieldLabel>Instagram</FieldLabel>
              <TextInput value={form.instagram} onChange={(v) => set('instagram', v)} />
            </div>
          </div>
          <ErrorText>{error}</ErrorText>
          <PrimaryButton disabled={loading}>{loading ? 'Sending code…' : 'Continue'}</PrimaryButton>
        </form>
      ) : (
        <form onSubmit={verifyAndCreate}>
          <p style={{ fontSize: 13, color: '#555', marginTop: 0 }}>
            We sent a 6-digit code to <strong>{form.email}</strong>. Enter it to finish creating your account.
          </p>
          <FieldLabel required>Verification code</FieldLabel>
          <TextInput
            value={token}
            onChange={(v) => setToken(v.replace(/\D/g, '').slice(0, 6))}
            required
            placeholder="123456"
            inputMode="numeric"
          />
          <ErrorText>{error}</ErrorText>
          <PrimaryButton disabled={loading}>{loading ? 'Creating account…' : 'Verify & create account'}</PrimaryButton>
          <button
            type="button"
            onClick={() => setStep('form')}
            style={{ background: 'none', border: 'none', color: '#6b8f5e', fontSize: 13, marginTop: 12, cursor: 'pointer' }}
          >
            ← Back to details
          </button>
        </form>
      )}

      <p style={{ fontSize: 13, color: '#555', marginTop: 20, marginBottom: 0 }}>
        Already registered?{' '}
        <Link href="/portal/login" style={{ color: '#2d7a3a', fontWeight: 600 }}>
          Sign in
        </Link>
      </p>
    </AuthCard>
  )
}
