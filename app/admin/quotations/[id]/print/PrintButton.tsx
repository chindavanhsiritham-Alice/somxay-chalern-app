'use client'

export default function PrintButton() {
  return (
    <div className="no-print" style={{ textAlign: 'right', marginBottom: 16 }}>
      <button
        onClick={() => window.print()}
        style={{ background: '#2d7a3a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
      >
        🖨️ พิมพ์ / บันทึกเป็น PDF
      </button>
      <style>{'@media print { .no-print { display: none; } }'}</style>
    </div>
  )
}
