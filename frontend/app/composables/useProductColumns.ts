import type { Column } from '~/types/data-table'

export interface ProductRow extends Record<string, unknown> {
  id: string
  code: string
  displayName: string
  baseUnit: string
  isBkp: boolean
  isActive: boolean
  unitConversions: { unitName: string, level: number }[]
}

export function useProductColumns(): Column<ProductRow>[] {
  return [
    { key: 'code', label: 'Kode', width: '120px', mono: true },
    { key: 'displayName', label: 'Nama Produk' },
    { key: 'baseUnit', label: 'Satuan Dasar', width: '140px' },
    {
      key: 'unitConversions',
      label: 'Konversi',
      format: (v) => {
        const rows = v as { unitName: string, level: number }[] | undefined
        if (!rows || !rows.length) return '-'
        // Terbesar ke terkecil (level tinggi = besar), konsisten dengan urutan input di form.
        return [...rows].sort((a, b) => b.level - a.level).map(r => r.unitName).join(', ')
      }
    },
    { key: 'isBkp', label: 'BKP', align: 'center', format: v => (v ? 'Ya' : '-') },
    { key: 'isActive', label: 'Status', align: 'center', format: v => (v ? 'Aktif' : 'Nonaktif') }
  ]
}
