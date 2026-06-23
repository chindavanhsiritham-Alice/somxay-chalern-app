'use client'

import Link from 'next/link'

export function AuthCard({
  title,
  subtitle,
  children,
  wide,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        background: '#f5f1e8',
        fontFamily: 'system-ui, sans-serif',
        padding: '40px 16px',
      }}
    >
      <div
        style={{
          background: '#fff',
          padding: 32,
          borderRadius: 16,
          width: '100%',
          maxWidth: wide ? 560 : 380,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          boxSizing: 'border-box',
        }}
      >
        <Link href="/portal/products" style={{ color: '#a8e063', fontWeight: 700, fontSize: 18, textDecoration: 'none' }}>
          ☕ Somxay Coffee
        </Link>
        <h1 style={{ color: '#2d4a3a', margin: '16px 0 2px', fontSize: 24 }}>{title}</h1>
        {subtitle && <p style={{ color: '#6b8f5e', marginTop: 0, marginBottom: 20, fontSize: 14 }}>{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}

export function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: 'block', fontSize: 13, color: '#555', marginBottom: 4, marginTop: 12 }}>
      {children}
      {required && <span style={{ color: '#c0392b' }}> *</span>}
    </label>
  )
}

const inputBase: React.CSSProperties = {
  width: '100%',
  padding: 10,
  borderRadius: 8,
  border: '1px solid #ddd',
  boxSizing: 'border-box',
  fontSize: 14,
}

export function TextInput({
  value,
  onChange,
  type = 'text',
  required,
  placeholder,
  inputMode,
}: {
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  placeholder?: string
  inputMode?: 'numeric' | 'text' | 'tel' | 'email'
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      placeholder={placeholder}
      inputMode={inputMode}
      style={inputBase}
    />
  )
}

export function SelectInput({
  value,
  onChange,
  options,
  required,
}: {
  value: string
  onChange: (v: string) => void
  options: readonly string[]
  required?: boolean
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} required={required} style={inputBase}>
      <option value="">Select…</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}

export function PrimaryButton({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      style={{
        width: '100%',
        padding: 12,
        marginTop: 16,
        background: disabled ? '#9bbf8c' : '#2d4a3a',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        fontSize: 15,
        fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null
  return <p style={{ color: '#c0392b', fontSize: 13, marginTop: 12, marginBottom: 0 }}>{children}</p>
}
