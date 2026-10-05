import type { Column } from '~/types/data-table'

export interface SalesmanRow extends Record<string, unknown> {
  id: string
  code: string
  name: string
  isActive: boolean
}

export function useSalesmanColumns(): Column<SalesmanRow>[] {
  return [
    { key: 'name', label: 'Nama Salesman' },
    { key: 'code', label: 'Kode', width: '140px', mono: true },
    { key: 'isActive', label: 'Status', align: 'center', format: v => (v ? 'Aktif' : 'Nonaktif') }
  ]
}
