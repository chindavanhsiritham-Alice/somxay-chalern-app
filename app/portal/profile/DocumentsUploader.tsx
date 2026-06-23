'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DOCUMENT_TYPES } from '@/lib/portal'

export interface DocRecord {
  id: string
  doc_type: string
  url: string | null
}

export default function DocumentsUploader({ customerId, initialDocs }: { customerId: string; initialDocs: DocRecord[] }) {
  const supabase = createClient()
  const router = useRouter()
  const [busyType, setBusyType] = useState<string | null>(null)
  const [error, setError] = useState('')

  const existing = new Map(initialDocs.map((d) => [d.doc_type, d]))

  async function upload(docType: string, file: File) {
    setBusyType(docType)
    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setBusyType(null)
      setError('Your session expired. Please sign in again.')
      return
    }

    const ext = file.name.split('.').pop() || 'pdf'
    const path = `${user.id}/${docType}.${ext}`
    const { error: upErr } = await supabase.storage.from('customer_documents').upload(path, file, { upsert: true })
    if (upErr) {
      setBusyType(null)
      setError(upErr.message)
      return
    }

    const { error: rowErr } = await supabase
      .from('customer_documents')
      .upsert(
        { customer_id: customerId, user_id: user.id, doc_type: docType, file_path: path, uploaded_at: new Date().toISOString() },
        { onConflict: 'customer_id,doc_type' }
      )
    setBusyType(null)
    if (rowErr) {
      setError(rowErr.message)
      return
    }
    router.refresh()
  }

  return (
    <div style={{ maxWidth: 640, marginTop: 24 }}>
      <h2 style={{ color: '#2d4a3a', fontSize: 18, marginBottom: 4 }}>Documents</h2>
      <p style={{ color: '#6b8f5e', marginTop: 0, fontSize: 14 }}>Optional uploads to speed up verification.</p>

      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'grid', gap: 14 }}>
        {DOCUMENT_TYPES.map((d) => {
          const doc = existing.get(d.value)
          const busy = busyType === d.value
          return (
            <div key={d.value} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderBottom: '1px solid #f5f5f5', paddingBottom: 12 }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 600, color: '#2d4a3a', fontSize: 14 }}>{d.label}</div>
                {doc?.url ? (
                  <a href={doc.url} target="_blank" rel="noreferrer" style={{ color: '#2d7a3a', fontSize: 13 }}>
                    View uploaded file
                  </a>
                ) : (
                  <span style={{ color: '#9aa', fontSize: 13 }}>Not uploaded</span>
                )}
              </div>
              <label
                style={{
                  background: busy ? '#cfe0cf' : '#2d7a3a',
                  color: '#fff',
                  borderRadius: 8,
                  padding: '8px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: busy ? 'default' : 'pointer',
                }}
              >
                {busy ? 'Uploading…' : doc ? 'Replace' : 'Upload'}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  disabled={busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) upload(d.value, f)
                  }}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          )
        })}
        {error && <p style={{ color: '#c0392b', fontSize: 13, margin: 0 }}>{error}</p>}
      </div>
    </div>
  )
}
