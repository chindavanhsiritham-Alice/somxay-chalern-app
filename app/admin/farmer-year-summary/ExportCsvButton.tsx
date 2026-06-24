'use client'

export type FarmerYearRow = { farmerId: string; name: string; village: string; volume: number; value: number }

export default function ExportCsvButton({ rows, year }: { rows: FarmerYearRow[]; year: number }) {
  function handleExport() {
    const header = ['Farmer', 'Village', 'Volume (kg)', 'Sales Value (THB)']
    const lines = rows.map((r) => [r.name, r.village, r.volume, r.value].join(','))
    const csv = [header.join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `farmer-cherry-summary-${year}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      style={{ background: '#2d7a3a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
    >
      Export CSV
    </button>
  )
}
