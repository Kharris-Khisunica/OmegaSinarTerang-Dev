import type { Column } from '~/types/data-table'

export interface UnitRow extends Record<string, unknown> {
  id: string
  code: string
  name: string
  isActive: boolean
}

export function useUnitColumns(): Column<UnitRow>[] {
  return [
    { key: 'name', label: 'Nama Satuan' },
    { key: 'code', label: 'Kode', width: '140px', mono: true },
    { key: 'isActive', label: 'Status', align: 'center', format: v => (v ? 'Aktif' : 'Nonaktif') }
  ]
}
