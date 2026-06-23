'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OrderActions({ orderId, status }: { orderId: string; status: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function uploadSlip() {
    if (!file) return
    setBusy(true)
    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setBusy(false)
      setError('Your session expired. Please sign in again.')
      return
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${user.id}/${orderId}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('payment_slips')
      .upload(path, file, { upsert: true })
    if (uploadError) {
      setBusy(false)
      setError(uploadError.message)
      return
    }

    const { error: rpcError } = await supabase.rpc('submit_order_payment', {
      p_order_id: orderId,
      p_slip_path: path,
    })
    setBusy(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    router.refresh()
  }

  async function cancel() {
    if (!window.confirm('Cancel this order? Reserved stock will be released.')) return
    setBusy(true)
    setError('')
    const { error: rpcError } = await supabase.rpc('cancel_customer_order', { p_order_id: orderId })
    setBusy(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    router.refresh()
  }

  const canPay = status === 'pending_payment'
  const canCancel = status === 'pending_payment' || status === 'payment_submitted'

  return (
    <div style={{ marginTop: 8 }}>
      {canPay && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          <label style={{ fontSize: 13, color: '#555' }}>Upload payment slip (image or PDF)</label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{ fontSize: 13 }}
          />
          <button
            onClick={uploadSlip}
            disabled={!file || busy}
            style={{
              background: file && !busy ? '#2d7a3a' : '#cfe0cf',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 14,
              fontWeight: 600,
              cursor: file && !busy ? 'pointer' : 'default',
              width: 'fit-content',
            }}
          >
            {busy ? 'Submitting…' : 'Submit payment'}
          </button>
        </div>
      )}

      {status === 'payment_submitted' && (
        <p style={{ fontSize: 14, color: '#1b4f86' }}>Payment slip submitted — awaiting admin confirmation.</p>
      )}

      {canCancel && (
        <button
          onClick={cancel}
          disabled={busy}
          style={{
            background: 'none',
            color: '#9a2a2a',
            border: '1px solid #e0b4b4',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 13,
            cursor: busy ? 'default' : 'pointer',
          }}
        >
          Cancel order
        </button>
      )}

      {error && <p style={{ color: '#c0392b', fontSize: 13 }}>{error}</p>}
    </div>
  )
}
