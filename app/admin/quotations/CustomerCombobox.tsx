'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import type { Customer } from '@/lib/crm/types'

export type CustomerOption = Pick<
  Customer,
  'id' | 'customer_code' | 'company_name' | 'shop_name' | 'owner_name' | 'phone' | 'whatsapp' | 'email' | 'tier' | 'status'
>

const fieldInput: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 15, boxSizing: 'border-box' }

function customerLabel(c: CustomerOption) {
  return c.company_name ?? c.shop_name ?? c.owner_name ?? c.customer_code ?? c.id
}

function customerSubLabel(c: CustomerOption) {
  return [c.customer_code, c.phone, c.email].filter(Boolean).join(' · ')
}

function matches(c: CustomerOption, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [c.company_name, c.shop_name, c.owner_name, c.phone, c.whatsapp, c.email, c.customer_code].some((field) =>
    field ? field.toLowerCase().includes(q) : false
  )
}

export default function CustomerCombobox({
  customers,
  value,
  onChange,
  error,
}: {
  customers: CustomerOption[]
  value: string
  onChange: (customerId: string) => void
  error?: string
}) {
  const selected = useMemo(() => customers.find((c) => c.id === value) ?? null, [customers, value])
  const [query, setQuery] = useState(selected ? customerLabel(selected) : '')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [syncedValue, setSyncedValue] = useState(value)

  if (value !== syncedValue) {
    setSyncedValue(value)
    setQuery(selected ? customerLabel(selected) : '')
  }

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const filtered = useMemo(() => customers.filter((c) => matches(c, query)).slice(0, 50), [customers, query])

  if (customers.length === 0) {
    return (
      <div style={{ padding: 14, background: '#fff8ec', border: '1px solid #e0a23c', borderRadius: 8, fontSize: 13, color: '#915c1c' }}>
        ยังไม่มีลูกค้าที่ใช้งานอยู่ (สถานะ active) ในระบบ —{' '}
        <Link href="/admin/customers" style={{ color: '#2d7a3a', fontWeight: 600 }}>
          ไปที่หน้าจัดการลูกค้า
        </Link>{' '}
        เพื่อเพิ่มลูกค้าก่อน
      </div>
    )
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          if (value) onChange('')
        }}
        onFocus={() => setOpen(true)}
        placeholder="ค้นหาด้วยชื่อบริษัท, ชื่อร้าน, ชื่อเจ้าของ, เบอร์โทร, WhatsApp หรืออีเมล..."
        style={{ ...fieldInput, borderColor: error ? '#c0392b' : '#ccc' }}
      />
      {selected && (
        <button
          type="button"
          onClick={() => {
            onChange('')
            setQuery('')
            setOpen(true)
          }}
          aria-label="ล้างลูกค้าที่เลือก"
          style={{
            position: 'absolute',
            right: 8,
            top: 8,
            background: 'none',
            border: 'none',
            color: '#999',
            fontSize: 16,
            cursor: 'pointer',
            padding: 4,
          }}
        >
          ×
        </button>
      )}
      {error && <p style={{ color: '#c0392b', fontSize: 12, marginTop: 4 }}>{error}</p>}
      {open && (
        <div
          style={{
            position: 'absolute',
            zIndex: 20,
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 8,
            boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {filtered.length === 0 ? (
            <p style={{ padding: 14, fontSize: 13, color: '#999', margin: 0 }}>ไม่พบลูกค้าที่ตรงกับคำค้นหา</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onChange(c.id)
                  setQuery(customerLabel(c))
                  setOpen(false)
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '11px 14px',
                  background: c.id === value ? '#eef2ea' : '#fff',
                  border: 'none',
                  borderBottom: '1px solid #f0f0f0',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                <div style={{ color: '#2d4a3a', fontWeight: 600 }}>{customerLabel(c)}</div>
                {customerSubLabel(c) && <div style={{ color: '#999', fontSize: 12, marginTop: 2 }}>{customerSubLabel(c)}</div>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
