import type { Column } from '~/types/data-table'

export interface BrandRow extends Record<string, unknown> {
  id: string
  code: string
  name: string
  isActive: boolean
}

export function useBrandColumns(): Column<BrandRow>[] {
  return [
    { key: 'name', label: 'Nama Merek' },
    { key: 'code', label: 'Kode', width: '140px', mono: true },
    { key: 'isActive', label: 'Status', align: 'center', format: v => (v ? 'Aktif' : 'Nonaktif') }
  ]
}
